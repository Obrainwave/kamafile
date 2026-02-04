import{c as o}from"./createLucideIcon-CSaQ5UJr.js";import{b as s}from"./api-sa1Artjr.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e=[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]],p=o("send",e);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],i=o("user",n),d={startOnboarding:async a=>(await s.post("/api/onboarding/start",a)).data,processStep:async a=>(await s.post("/api/onboarding/step",a)).data,getStatus:async a=>(await s.get(`/api/onboarding/status/${a}`)).data};export{p as S,i as U,d as o};
