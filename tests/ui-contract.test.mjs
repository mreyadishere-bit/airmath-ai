import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const finger=readFileSync(new URL('../src/finger-ui.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
const cameraStart=html.indexOf('class="stage" id="stage"');
const controls=html.indexOf('class="control-dock"');
const results=html.indexOf('id="fingerResult"');
assert.ok(cameraStart>=0 && controls>cameraStart && results>controls,
  'Controls and results must be outside the video stage');
const cameraMarkup=html.slice(cameraStart,controls);
for(const forbidden of ['id="cameraOperations"','id="fingerInstruction"','id="overlayA"','id="overlayB"','id="fingerResult"']) {
  assert.ok(!cameraMarkup.includes(forbidden),'Must not cover camera with '+forbidden);
}
assert.ok(!html.includes('class="sidebar"'),'Old sidebar must be removed');
assert.ok(!html.includes('class="intro"'),'Old hero section must be removed');
assert.ok(!finger.includes('tipNames') && !finger.includes("label='HAND"),'Landmark names must not be drawn');
assert.ok(css.includes('.settings-drawer'),'Settings must be collapsible');
assert.ok(js.includes("tracker.setMode('count')"),'Launch directly in finger math mode');
const ids=[...js.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g),
             ...finger.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g)].map(v=>v[1]);
for(const id of [...new Set(ids)]) {
  assert.ok(html.includes('id="'+id+'"'),'Referenced element not found: '+id);
}
assert.ok(css.includes('height:100dvh') && css.includes('overflow:hidden'),
  'Application must fit the viewport without page scrolling');
assert.ok(js.includes('availableHeight-dock.offsetHeight-results.offsetHeight-gap*2'),
  'Camera sizing must reserve room for the controls and results');
assert.ok(finger.includes('panel.hidden=false'),
  'Result dock must have reserved space even before an equation is solved');
assert.ok(finger.includes('pen.shadowBlur') && finger.includes('const mesh='),
  'Gesture visual should render a layered palm mesh and enhanced skeleton');
console.log('Camera-first UI contract tests passed');
