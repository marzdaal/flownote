const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-Cnb_VZ-h.js","assets/core-DlQNAQKj.js","assets/index-CchA2TY-.js"])))=>i.map(i=>d[i]);
import{d as V,u as S,a as T,r as v,c as y,b as e,e as F,f as d,g as p,F as N,t as D,h as A,i as c,P as C,_ as f,j as E,o as g}from"./index-CR-Xk5qI.js";import{F as P}from"./folder-open-eSJT1vUG.js";const j={class:"h-screen flex items-center justify-center bg-surface-dark"},$={class:"max-w-md w-full mx-4"},I={class:"text-center mb-8"},O={class:"w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center"},L={key:0,class:"mb-4 p-3 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm"},M={class:"space-y-3"},R=["disabled"],W=["disabled"],U=V({__name:"WelcomeView",setup(B){const i=S(),s=T(),n=E(),o=v(!1),u=v(null);async function w(){o.value=!0,u.value=null;try{const{open:a}=await f(async()=>{const{open:r}=await import("./index-Cnb_VZ-h.js");return{open:r}},__vite__mapDeps([0,1])),t=await a({directory:!0,multiple:!1,title:"Select Vault Folder"});t&&typeof t=="string"&&(i.updateSetting("vaultPath",t),s.vaultConfig.path=t,await s.initVault(),n.push("/inbox"))}catch{const t=prompt("Enter vault path (e.g., /Users/you/vault):");t&&(i.updateSetting("vaultPath",t),s.vaultConfig.path=t,await s.initVault(),n.push("/inbox"))}finally{o.value=!1}}async function x(){o.value=!0,u.value=null;try{const{open:a}=await f(async()=>{const{open:r}=await import("./index-Cnb_VZ-h.js");return{open:r}},__vite__mapDeps([0,1])),t=await a({directory:!0,multiple:!1,title:"Select Folder for New Vault"});t&&typeof t=="string"&&(await m(t),i.updateSetting("vaultPath",t),s.vaultConfig.path=t,await s.initVault(),n.push("/inbox"))}catch{const t=prompt("Enter path for new vault (e.g., /Users/you/my-vault):");t&&(await m(t),i.updateSetting("vaultPath",t),s.vaultConfig.path=t,await s.initVault(),n.push("/inbox"))}finally{o.value=!1}}async function m(a){try{const{mkdir:t,writeTextFile:r}=await f(async()=>{const{mkdir:l,writeTextFile:k}=await import("./index-CchA2TY-.js");return{mkdir:l,writeTextFile:k}},__vite__mapDeps([2,1])),h=["00 - Inbox","01 - Projects","02 - Tasks/Next Actions","02 - Tasks/Waiting For","02 - Tasks/Someday Maybe","03 - Notes","04 - Daily","05 - Areas","06 - Templates","Archive"];for(const l of h)await t(`${a}/${l}`,{recursive:!0});await r(`${a}/README.md`,`# My Vault

Welcome to your new FlowNotes vault!

## Folder Structure

- **00 - Inbox** — Quick capture, unprocessed items
- **01 - Projects** — Active projects
- **02 - Tasks** — Tasks organized by status
- **03 - Notes** — Your knowledge base
- **04 - Daily** — Daily notes
- **05 - Areas** — Areas of life
- **06 - Templates** — Note templates
- **Archive** — Completed items
`);const _=["Work","Health","Learning","Home"];for(const l of _)await r(`${a}/05 - Areas/${l}.md`,`---
type: area
created: ${new Date().toISOString().split("T")[0]}
---

# ${l}

## Description

## Goals
`)}catch{console.log("Could not create vault structure via Tauri, using mock mode")}}function b(){i.updateSetting("vaultPath","demo"),s.initVault(),n.push("/inbox")}return(a,t)=>(g(),y("div",j,[e("div",$,[e("div",I,[e("div",O,[d(p(N),{class:"w-10 h-10 text-white"})]),t[0]||(t[0]=e("h1",{class:"text-3xl font-bold text-gray-100"},"FlowNotes",-1)),t[1]||(t[1]=e("p",{class:"text-gray-500 mt-2"},"GTD + Zettelkasten for your local files",-1))]),u.value?(g(),y("div",L,D(u.value),1)):F("",!0),e("div",M,[e("button",{class:"w-full btn bg-accent hover:bg-accent-hover text-white py-4 text-lg",disabled:o.value,onClick:w},[d(p(P),{class:"w-5 h-5"}),t[2]||(t[2]=c(" Open Existing Vault ",-1))],8,R),e("button",{class:"w-full btn-secondary py-4 text-lg",disabled:o.value,onClick:x},[d(p(C),{class:"w-5 h-5"}),t[3]||(t[3]=c(" Create New Vault ",-1))],8,W),t[4]||(t[4]=A('<div class="relative py-4"><div class="absolute inset-0 flex items-center"><div class="w-full border-t border-border"></div></div><div class="relative flex justify-center"><span class="px-4 bg-surface-dark text-gray-500 text-sm">or</span></div></div>',1)),e("button",{class:"w-full btn-ghost py-3 text-gray-400",onClick:b}," Try Demo Mode ")]),t[5]||(t[5]=e("p",{class:"text-center text-xs text-gray-600 mt-8"},[c(" FlowNotes works with local markdown files."),e("br"),c(" Your data stays on your computer. ")],-1))])]))}});export{U as default};
