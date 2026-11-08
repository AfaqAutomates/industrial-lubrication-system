import { useState } from "react";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function dateNearLabel(text, label) {
  const lines = text.split(/\r?\n/);
  const index = lines.findIndex((line) => label.test(line));
  const sample = index < 0 ? "" : [lines[index], lines[index + 1] || ""].join(" ");
  const match = sample.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (!match) return "";
  const year = match[3].length === 2 ? "20" + match[3] : match[3];
  return year + "-" + match[2].padStart(2, "0") + "-" + match[1].padStart(2, "0");
}

function textNearLabel(lines, label) {
  const index = lines.findIndex((line) => label.test(line));
  if (index < 0) return "";
  const sameLine = lines[index].replace(label, "").replace(/^[\s:.-]+/, "").trim();
  if (sameLine) return sameLine.slice(0, 100);
  return (lines[index + 1] || "").trim().slice(0, 100);
}

function resultNearLabel(lines, label) {
  const index = lines.findIndex((line) => label.test(line));
  if (index < 0) return "";
  let value = lines[index].replace(label, " ");
  value = value.replace(/(?:ASTM\s*)?D\s*\d{2,5}(?:\s*[/,]\s*D?\s*\d{2,5})*/gi, " ");
  const matches = [...value.matchAll(/(?:<=|>=|<|>|≤|≥)?\s*-?\d+(?:[.,]\d+)?/g)];
  if (matches.length) return matches[matches.length - 1][0].replace(",", ".").replace(/\s+/g, "");
  if (/crackle|blotter|appearance|color/i.test(String(label))) {
    const cleaned = value.replace(/\b(?:method|visual|test)\b/gi, " ").replace(/\s+/g, " ").trim();
    return cleaned.slice(0, 80);
  }
  return "";
}

function parseReport(text) {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const parsed = {};
  const setText = (key, regex) => { const value = textNearLabel(lines, regex); if (value) parsed[key] = value; };
  const setResult = (key, regex) => { const value = resultNearLabel(lines, regex); if (value) parsed[key] = value; };

  const sampleLine = lines.find((line) => /sample\s*(?:no|number|id).*kll/i.test(line));
  const sampleMatch = (sampleLine || text).match(/\b(?:ISL|KLL)[\s_-]*\d{2,}[\s/-]*\d{2,}\b/i);
  if (sampleMatch) {
    parsed.sample_id = sampleMatch[0].replace(/\s+/g, "");
    parsed.laboratory_report_no = parsed.sample_id;
  }
  setText("customer_name", /customer\s*:?/i);
  setText("cell_number", /cell\s*(?:#|no\.?)\s*:?/i);
  setText("land_line_number", /land\s*line\s*(?:#|no\.?)\s*:?/i);
  setText("batch_number", /batch\s*(?:#|no\.?)\s*:?/i);
  setText("equipment_name", /^equipment\s*:/i);
  setText("equipment_make", /^make\s*:?/i);
  setText("equipment_model", /^model\s*:?/i);
  setText("equipment_serial_no", /serial\s*(?:no\.?|number)\s*:?/i);
  setText("oil_top_up_volume", /oil\s*top\s*up\s*volume\s*:?/i);
  setText("oil_sump_capacity", /oil\s*sump\s*capacity\s*:?/i);
  const oilLine = lines.find((line) => /used\s*oil|fresh\s*oil/i.test(line)) || "";
  if (/fresh\s*oil.*(?:yes|checked|x|✓)/i.test(oilLine)) parsed.oil_condition = "Fresh oil";
  else if (/used\s*oil.*(?:yes|checked|x|✓)/i.test(oilLine)) parsed.oil_condition = "Used oil";
  setText("reason_for_testing", /reason\s*for\s*testing\s*:?/i);
  setText("initiated_by", /initiated\s*by\s*:?/i);
  setText("tested_by", /tested\s*by\s*:?/i);
  setText("reviewed_by", /reviewed\s*by\s*:?/i);
  setText("approved_by", /approved\s*by\s*:?/i);
  setText("receiving_time", /receiving\s*date\s*\/?\s*time\s*:?/i);
  if (!parsed.laboratory && /kot\s*lah?ore?pat\s*laboratory/i.test(text)) parsed.laboratory = "KOT LAKHPAT LABORATORY";
  else if (!parsed.laboratory && /chevron/i.test(text)) parsed.laboratory = "Chevron Pakistan Lubricants";
  if (!parsed.reported_product_grade) {
    const productIndex = lines.findIndex((line) => /product\s*name\s*(?:&|and)\s*grade/i.test(line));
    const productLine = productIndex >= 0 ? lines[productIndex] + " " + (lines[productIndex + 1] || "") : "";
    const grade = productLine.match(/\b(?:VG|ISO\s*VG)\s*\d+\b/i);
    if (grade) parsed.reported_product_grade = grade[0].replace(/\s+/g, " ").toUpperCase();
  }

  parsed.sample_date = dateNearLabel(text, /date\s*of\s*sampling/i) || dateNearLabel(text, /sampling\s*date/i) || "";
  parsed.receiving_date = dateNearLabel(text, /receiving\s*date/i) || "";
  if (!parsed.sample_date) delete parsed.sample_date;
  if (!parsed.receiving_date) delete parsed.receiving_date;

  setResult("density_15c", /density\s*@?\s*15\s*°?\s*c/i);
  setResult("tan", /acid\s*(?:number|no\.?)/i);
  setResult("tbn", /base\s*(?:number|no\.?)/i);
  setResult("viscosity", /viscosity\s*@?\s*40\s*°?\s*c/i);
  setResult("viscosity_100c", /viscosity\s*@?\s*100\s*°?\s*c/i);
  setResult("viscosity_index", /viscosity\s*index/i);
  setResult("apparent_viscosity_minus15c", /app\.?\s*viscosity.*-\s*15/i);
  setResult("treat_rate", /treat\s*rate/i);
  setResult("water_pct", /water\s*%/i);
  setResult("karl_fischer_water", /karl\s*fischer\s*water/i);
  setResult("iron", /^iron\b/i);
  setResult("copper", /^copper\b/i);
  setResult("chromium", /^chromium\b/i);
  setResult("lead", /^lead\b/i);
  setResult("silicon", /^silicon\b/i);
  setResult("sodium", /^sodium\b/i);
  setResult("aluminium", /^aluminium\b/i);
  setResult("tin", /^tin\b/i);
  setResult("zinc", /^zinc\b/i);
  setResult("calcium", /^calcium\b/i);
  setResult("magnesium", /^magnesium\b/i);
  setResult("fuel_dilution", /fuel\s*dilution/i);
  setResult("flash_point_coc", /flash\s*point.*\bcoc\b/i);
  setResult("flash_point_pmcc", /flash\s*point.*\bpmcc\b/i);
  setResult("flash_point_seta", /flash\s*point.*seta/i);
  setResult("pentane_insolubles", /pentane\s*insoluble/i);
  setResult("copper_corrosion_100c", /cu\s*corrosion\s*100\s*°?\s*c/i);
  setText("appearance", /^appearance\b/i);
  setText("color", /^color\b/i);
  setText("crackle", /^crackle\b/i);
  setText("blotter_spot_test", /blotter\s*spot/i);
  setResult("oxidation", /oxidation/i);
  setResult("nitration", /nitration/i);
  setResult("foam_tendency_seq1", /foam\s*tend.*(?:seq\.?\s*1|seq\s*i\b|sequence\s*1)/i);
  setResult("foam_tendency_seq2", /foam\s*tend.*(?:seq\.?\s*2|seq\s*ii\b|sequence\s*2)/i);
  setResult("foam_tendency_seq3", /foam\s*tend.*(?:seq\.?\s*3|seq\s*iii\b|sequence\s*3)/i);

  return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== ""));
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function rotateCanvas(source, angle) {
  const sideways = angle === 90 || angle === 270;
  const canvas = makeCanvas(sideways ? source.height : source.width, sideways ? source.width : source.height);
  const context = canvas.getContext("2d");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(angle * Math.PI / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

async function recognizeBest(worker, canvas) {
  let best = { text: "", score: -1 };
  for (const angle of [0, 90, 270, 180]) {
    const result = await worker.recognize(rotateCanvas(canvas, angle));
    const text = result.data.text || "";
    const confidence = Number(result.data.confidence) || 0;
    const score = confidence + Math.min(text.length / 20, 10);
    if (score > best.score) best = { text, score };
  }
  return best.text;
}

async function imageCanvas(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = makeCanvas(bitmap.width, bitmap.height);
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return canvas;
}

async function pdfCanvases(file) {
  const document = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const canvases = [];
  for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 4); pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = makeCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    canvases.push(canvas);
  }
  await document.destroy();
  return canvases;
}

export default function OilReportIntake({ onFileSelected, onExtracted }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    onFileSelected(file);
    setBusy(true);
    setStatus("Reading the scan in your browser…");
    let worker;
    try {
      worker = await createWorker("eng");
      const canvases = file.type === "application/pdf" ? await pdfCanvases(file) : [await imageCanvas(file)];
      let text = "";
      for (let index = 0; index < canvases.length; index += 1) {
        setStatus("Reading page " + (index + 1) + " of " + canvases.length + "…");
        text += "\n" + await recognizeBest(worker, canvases[index]);
      }
      const fields = parseReport(text);
      onExtracted(fields);
      setStatus(Object.keys(fields).length
        ? "OCR suggested " + Object.keys(fields).length + " fields. Review every value before saving; scanned text can be misread."
        : "The file is attached, but OCR could not confidently identify fields. Enter them manually before saving.");
    } catch (error) {
      setStatus("The file is selected for attachment, but text extraction failed: " + (error?.message || "unknown error"));
    } finally {
      if (worker) await worker.terminate();
      setBusy(false);
      event.target.value = "";
    }
  }

  return <div className="oil-report-intake">
    <label className="oil-report-upload">
      <span>{busy ? "Extracting report…" : "Choose scanned lab report (PDF, JPG, PNG, TIFF)"}</span>
      <input type="file" accept="application/pdf,image/jpeg,image/png,image/tiff,image/webp" onChange={handleFile} disabled={busy}/>
    </label>
    <p className="oil-report-status">{status || "OCR runs in this browser. The report is uploaded to your private Supabase storage only when you save the sample."}</p>
  </div>;
}


