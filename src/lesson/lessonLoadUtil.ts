import Lesson from "./types/Lesson";
import LessonLine from "./types/LessonLine";
import LessonInputEvent from "./types/LessonInputEvent";

import { loadMp3FromUrl } from 'sl-web-audio';
import {httpToHttps} from "../common/urlUtil";

enum MarkRowType {
  LINE, PRACTICE, INPUT
}

function _parseInputName(name:string):{yesLineNo:number|null, noLineNo:number|null, silenceLineNo:number|null} {
  const fields = name.split('_');
  let yesLineNo = null, noLineNo = null, silenceLineNo = null;
  for(let fieldI = 0; fieldI < fields.length; ++fieldI) {
    const field = fields[fieldI];
    if (field.startsWith('yes')) {
      yesLineNo = parseInt(field.substring(3));
    } else if (field.startsWith('no')) {
      noLineNo = parseInt(field.substring(2));
    } else if (field.startsWith('silence')) {
      silenceLineNo = parseInt(field.substring(7));
    }
  }
  return {yesLineNo, noLineNo, silenceLineNo};
}

function _isInputName(name:string):boolean {
  const {yesLineNo, noLineNo, silenceLineNo} = _parseInputName(name);
  return yesLineNo !== null || noLineNo !== null || silenceLineNo !== null;
}

async function _loadMarkRowsFromUrl(marksUrl:string):Promise<Object[]> {
  const rows:Object[] = [];
  const response = await fetch(marksUrl);
  const text = await response.text();
  const fromRows = text.split('\n');
  for (let i = 0; i < fromRows.length; i++) {
    const rowText = fromRows[i].trim();
    if (!rowText.startsWith('{') || !rowText.endsWith('}')) continue;
    let row = null;
    try {
      row = JSON.parse(rowText);
    } catch(e) {
      console.error('Error parsing row', rowText, e);
      throw Error(`Could not parse row ${i} of ${marksUrl}.`);
    }
    if (row.type !== 'ssml') continue;
    const name = row.value;
    if (!name) continue;
    if (name.startsWith('line')) { row.rowType = MarkRowType.LINE; }
    else if (name === 'practice') { row.rowType = MarkRowType.PRACTICE; }
    else if (_isInputName(name)) { row.rowType = MarkRowType.INPUT; }
    else { continue; }
    rows.push(row);
  }
  return rows;
}

function _findNextLineOrEnd(rowI:number, markRows:Object[]):number|null {
  for(let i = rowI + 1; i < markRows.length; ++i) {
    const row = markRows[i] as any;
    if (row.rowType === MarkRowType.LINE) return row.time;
  }
  return null;
}

function _findLineNoPrecedingTime(time:number, lines:LessonLine[]):number|null {
  for(let i = lines.length - 1; i > 0; --i) {
    const line = lines[i];
    if (line.from <= time) return i-1;
  }
  return null;
}

function _parseLessonLines(markRows:Object[], lineTexts:string[], lastLineEndTime:number):LessonLine[] {
  const lines:LessonLine[] = [];
  for(let rowI = 0; rowI < markRows.length; ++rowI) {
    const row = markRows[rowI] as any;
    if (row.rowType !== MarkRowType.LINE) continue;
    const to = _findNextLineOrEnd(rowI, markRows) ?? lastLineEndTime;
    const line:LessonLine = {from:row.time, to, text:lineTexts[lines.length]};
    lines.push(line);
  }
  return lines;
}

function _parsePracticeAfterLineNos(markRows:Object[], lines:LessonLine[]):number[] {
  const practiceAfterLineNos:number[] = [];
  for(let rowI = 0; rowI < markRows.length; ++rowI) {
    const row = markRows[rowI] as any;
    if (row.rowType !== MarkRowType.PRACTICE) continue;
    const lineNo = _findLineNoPrecedingTime(row.time, lines) ?? 0;
    practiceAfterLineNos.push(lineNo);
  }
  return practiceAfterLineNos;
}

function _parseInputEvents(markRows:Object[], lines:LessonLine[]):LessonInputEvent[] {
  const inputEvents:LessonInputEvent[] = [];
  for(let rowI = 0; rowI < markRows.length; ++rowI) {
    const row = markRows[rowI] as any;
    if (row.rowType !== MarkRowType.INPUT) continue;
    const afterLineNo = rowI === markRows.length - 1
      ? lines.length - 1    // I'm not sure why exactly, but the last mark for an input has a time preceding the last line. Special case it. 
      : _findLineNoPrecedingTime(row.time, lines) ?? 0;
    const {yesLineNo, noLineNo, silenceLineNo} = _parseInputName(row.value);
    const inputEvent:LessonInputEvent = {afterLineNo, yesLineNo, noLineNo, silenceLineNo};
    inputEvents.push(inputEvent);
  }
  return inputEvents;
}

function _removeSsmlTags(ssmlFragment:string):string {
  return ssmlFragment.replaceAll(/<[^>]+>/g, '');
}

function _parseLineTextsFromSsml(ssml:string):string[] {
  const lineTexts:string[] = [];
  const markedSegments = ssml.split('<mark ');
  for(let segmentI = 0; segmentI < markedSegments.length; ++segmentI) {
    const segment = markedSegments[segmentI];
    const markEnd = segment.indexOf('>');
    if (markEnd === -1) continue;
    const mark = segment.substring(0, markEnd);
    if (!mark.startsWith('name="')) continue;
    const name = mark.substring(6);
    if (!name.startsWith('line')) continue;
    const lineAttributeEnd = name.indexOf('"');
    const lineNo = parseInt(name.substring(4, lineAttributeEnd));
    if (lineNo !== lineTexts.length) throw Error(`Line number ${lineNo} does not match lineTexts length ${lineTexts.length}.`);
    const lineText = _removeSsmlTags(segment.substring(markEnd + 1));
    lineTexts.push(lineText);
  }
  return lineTexts;
}

async function _loadLessonJsonFromUrl(lessonUrl:string):Promise<{lessonName:string, mp3Url:string, marksUrl:string, lineTexts:string[]}> {
  const response = await fetch(lessonUrl);
  const jsonObject = await response.json();
  let {mp3url:mp3Url, marksUrl, ssml, lessonName} = jsonObject;
  if (!mp3Url) throw Error(`No mp3Url in ${lessonUrl}.`);
  if (!marksUrl) throw Error(`No marksUrl in ${lessonUrl}.`);
  if (!ssml) throw Error(`No ssml in ${lessonUrl}.`);
  if (!lessonName) throw Error(`No lessonName in ${lessonUrl}.`);
  mp3Url = httpToHttps(mp3Url); // TODO - delete this code after there are no lessons pointing to http.
  marksUrl = httpToHttps(marksUrl);
  const lineTexts = _parseLineTextsFromSsml(ssml);
  return {lessonName, mp3Url, marksUrl, lineTexts};
}

export async function loadLesson(lessonUrl:string):Promise<Lesson> {
  const {lessonName, mp3Url, marksUrl, lineTexts} = await _loadLessonJsonFromUrl(lessonUrl);
  const audioBuffer = await loadMp3FromUrl(mp3Url);
  const markRows = await _loadMarkRowsFromUrl(marksUrl);

  const lastLineEndTime = Math.floor(audioBuffer.duration * 1000);
  const lines = _parseLessonLines(markRows, lineTexts, lastLineEndTime);
  const practiceAfterLineNos = _parsePracticeAfterLineNos(markRows, lines);
  const inputEvents = _parseInputEvents(markRows, lines);
  
  return {name:lessonName, audioBuffer, lines, practiceAfterLineNos, inputEvents} as Lesson;
}