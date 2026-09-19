import {validateConfig, parseCSV, calculate} from './model.js';
const $ = id => document.getElementById(id);
const number = value => value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const date = value => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const iso = d => new Date(d*86400000).toISOString().slice(0,10);
const set = (id,text) => $(id).textContent = text;
function cells(parent, values) { const tr = document.createElement('tr'); for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}parent.append(tr);return tr; }
function render(config,rows,m){
  set('school-name',config.schoolName);document.title=`${config.schoolName} • Volunteer hours`;
  set('year',`${config.startDate.slice(0,4)}–${config.endDate.slice(2,4)}`);
  set('goal-heading',`${config.goalHours} hours`);set('chart-goal',config.goalHours);
  set('completed',number(m.ev));set('completion',`${number(m.completion)}% of our ${number(m.goal)}-hour goal`);
  $('progress-fill').style.width=`${Math.min(m.completion,100)}%`;
  set('status',m.status);$('status').dataset.status=m.achieved || (!m.behind&&!m.awaiting)?'good':m.behind?'behind':'waiting';
  set('status-note',m.achieved?'You did it! Every act of service made a difference.':m.awaiting?'Our starting line is set. The first weekly total is coming soon.':`${number(Math.abs(m.variance))} hours ${m.behind?'behind':'ahead of'} the plan at this report.`);
  set('baseline',number(m.baseline));set('required-label',m.behind?'REVISED WEEKLY TARGET':'WEEKLY PACE NEEDED');
  set('required',m.required === null?'—':number(m.required));
  set('required-note',m.achieved?'Goal achieved. Keep the good going!':m.required===null?`Campaign ended ${date(config.endDate)}; ${number(m.remaining)} hours short.`:`hours / week to finish • ${number(m.remaining)} hours to go`);
  set('date-range',`${date(config.startDate)} — ${date(config.endDate)}`);set('as-of',`As of ${date(m.latest.date)}`);
  set('freshness',m.stale?'Update due • The latest data is more than a week old.':m.awaiting?'Zero-hour baseline • Awaiting first report':'Latest recorded total');
  set('chart-note',m.awaiting?'The dot at zero is our starting baseline, not a weekly report. Add the first cumulative total to start our progress line.':'Our progress ends at the latest report. All pace calculations use that report date, including when an update is overdue.');
  renderChart(rows,m);
  let resizeTimer; window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>renderChart(rows,m),100);});
  [25,50,75,100].forEach((percent,i)=>{const el=document.createElement('div');el.className=`milestone${m.completion>=percent?' reached':''}`;const icon=document.createElement('span');icon.className='milestone-icon';icon.textContent=m.completion>=percent?'★':['✧','✦','✴','★'][i];icon.setAttribute('aria-hidden','true');const text=document.createElement('div');const title=document.createElement('strong');title.textContent=['A great start','Halfway there','Almost there','We did it!'][i];const small=document.createElement('small');small.textContent=`${percent}% · ${number(m.goal*percent/100)} hrs${m.completion>=percent?' · reached':''}`;text.append(title,small);el.append(icon,text);$('milestones').append(el);});
  set('calculation-context',`As of ${date(m.latest.date)}: ${m.elapsed} elapsed days and ${m.remainingDays} remaining days. Every calendar week counts, including breaks. The final partial week is prorated. Displayed results are rounded; calculations use full precision.`);
  const measures=[
    ['Goal (BAC analogue)',`Goal = ${number(m.goal)} hours`,'The total volunteer hours we aim to complete.'],
    ['Total duration',`${m.duration} days ÷ 7 = ${(m.duration/7).toFixed(4)} weeks`,'Time from the starting baseline to the deadline.'],
    ['Baseline weekly target',`Goal ÷ total weeks = ${number(m.goal)} ÷ (${m.duration} ÷ 7) = ${number(m.baseline)} hours/week`,'The original steady pace for the whole campaign.'],
    ['Planned value (PV)',`Goal × elapsed days ÷ total days = ${number(m.goal)} × ${m.elapsed} ÷ ${m.duration} = ${number(m.pv)} hours`,'How many hours were planned by this report date.'],
    ['Earned value (EV)',`Latest cumulative reported total = ${number(m.ev)} hours`,'The volunteer hours actually reported so far.'],
    ['Schedule variance (SV)',`EV − PV = ${number(m.ev)} − ${number(m.pv)} = ${number(m.variance)} hours`,'Positive is ahead; negative is behind. Status uses variance rounded to two decimals.'],
    ['Schedule performance index (SPI)',`EV ÷ PV = ${number(m.ev)} ÷ ${number(m.pv)} = ${m.spi===null?'unavailable (PV is zero)':number(m.spi)}`,'1.00 is on pace; below 1 is behind; above 1 is ahead.'],
    ['Goal completion',`EV ÷ goal × 100 = ${number(m.ev)} ÷ ${number(m.goal)} × 100 = ${number(m.completion)}%`,'Our share of the goal, including any hours beyond 100%.'],
    ['Hours remaining',`max(goal − EV, 0) = max(${number(m.goal)} − ${number(m.ev)}, 0) = ${number(m.remaining)} hours`,'Hours still needed to reach the goal.'],
    ['Remaining time',`${m.remainingDays} days ÷ 7 = ${(m.remainingDays/7).toFixed(4)} weeks`,'Time left after the latest report, including a partial week.'],
    ['Required weekly pace',m.achieved?'Goal reached → 0.00 hours/week':m.required===null?`No time remaining → ${number(m.remaining)} hours short`:`Remaining hours ÷ remaining weeks = ${number(m.remaining)} ÷ (${m.remainingDays} ÷ 7) = ${number(m.required)} hours/week`,'A forward-looking planning calculation, not a cost-based EVM measure.']
  ];
  measures.forEach(row=>cells($('formulas'),row));
  rows.forEach(row=>{const pv=m.goal*(row.day-m.start)/m.duration;cells($('reports'),[`${date(row.date)}${row.day===m.start?' (baseline)':''}`,number(row.hours),number(pv),number(row.hours-pv)]);});
  $('details').addEventListener('toggle',()=>{document.querySelector('.details-action').textContent=$('details').open?'Hide details −':'Show details ＋';});
}
function renderChart(rows,m){
  const svg=$('chart'),NS='http://www.w3.org/2000/svg';
  svg.replaceChildren(); $('tooltip').hidden=true;
  const width=Math.max(280,$('chart-wrap').clientWidth),right=width-20;
  svg.setAttribute('viewBox',`0 0 ${width} 350`);
  const add=(tag,attrs={},text,parent=svg)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(text!==undefined)el.textContent=text;parent.append(el);return el;};
  add('title',{id:'svg-title'},'Cumulative volunteer hours: our progress and on-track target');
  add('desc',{id:'svg-description'},`Goal: ${m.goal} hours. Latest total: ${number(m.ev)} hours on ${date(m.latest.date)}. Focus report and target markers for values, or open Behind the numbers for the report table.`);
  const max=Math.ceil(Math.max(m.goal,m.ev)*1.08/50)*50;
  const x=d=>42+(d-m.start)/m.duration*(right-42),y=h=>300-h/max*266;
  for(let i=0;i<=5;i++){const value=max*i/5;add('line',{x1:42,x2:right,y1:y(value),y2:y(value),class:'chart-grid'});add('text',{x:32,y:y(value)+4,'text-anchor':'end',class:'chart-axis'},String(Math.round(value)));}
  const monthDates=[m.start];let cursor=new Date(m.start*86400000);cursor.setUTCDate(1);cursor.setUTCMonth(cursor.getUTCMonth()+1);while(cursor.getTime()/86400000<m.end){monthDates.push(cursor.getTime()/86400000);cursor.setUTCMonth(cursor.getUTCMonth()+1);}monthDates.push(m.end);
  monthDates.forEach((d,i)=>{if(width<600 && i%2 && i!==monthDates.length-1)return;add('text',{x:x(d),y:331,'text-anchor':i===0?'start':i===monthDates.length-1?'end':'middle',class:'chart-axis'},new Date(d*86400000).toLocaleDateString('en-US',{month:'short',timeZone:'UTC'}));});
  const path=points=>points.map((p,i)=>`${i?'L':'M'}${x(p.day)},${y(p.hours)}`).join(' ');
  add('path',{d:path(m.targetPoints),class:'target-path'});add('path',{d:path(rows),class:'actual-path'});
  const marker=(p,type)=>{const label=`${type}, ${date(iso(p.day))}: ${number(p.hours)} hours`;const group=add('g',{tabindex:'0',role:'img','aria-label':label,class:'point'});add('circle',{cx:x(p.day),cy:y(p.hours),r:12,fill:'transparent',class:'point-ring'},undefined,group);add('circle',{cx:x(p.day),cy:y(p.hours),r:type==='Our progress'?5:2.5,fill:type==='Our progress'?'#087c77':'#738895',stroke:'white','stroke-width':type==='Our progress'?2:0},undefined,group);
    const show=()=>{const tip=$('tooltip');tip.textContent=label;tip.hidden=false;const w=$('chart-wrap').clientWidth;tip.style.left=`${Math.max(0,Math.min(x(p.day)-80,w-Math.min(230,w)))}px`;tip.style.top=`${Math.max(0,y(p.hours)-65)}px`;};const hide=()=>{$('tooltip').hidden=true;};group.addEventListener('mouseenter',show);group.addEventListener('mouseleave',hide);group.addEventListener('focus',show);group.addEventListener('blur',hide);group.addEventListener('click',show);group.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});};
  m.targetPoints.forEach(p=>marker(p,'On-track target'));rows.forEach(p=>marker(p,'Our progress'));
}
try{
  const [configResponse,dataResponse]=await Promise.all([fetch('./config.json',{cache:'no-store'}),fetch('./data/progress.csv',{cache:'no-store'})]);
  if(!configResponse.ok||!dataResponse.ok)throw new Error('Could not load config.json or data/progress.csv. Check that both files are included in the published repository.');
  const config=validateConfig(await configResponse.json()),rows=parseCSV(await dataResponse.text(),config);
  $('dashboard').hidden=false;render(config,rows,calculate(config,rows));
}catch(error){$('dashboard').hidden=true;set('error',`Progress could not be loaded. ${error.message} Check the CSV against the README, correct the data, and reload. For local viewing, use the README’s HTTP server instructions rather than opening index.html directly.`);$('error').hidden=false;}
finally{$('loading').hidden=true;}
