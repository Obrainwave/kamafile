import{j as e}from"./index-GfySL46g.js";import{C as d,a as x}from"./circle-check-big-DLq_I5XW.js";import{c as t}from"./createLucideIcon-cegUvQCe.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]],o=t("circle-x",m);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]],f=t("info",b);function p({children:s,severity:r="info",onClose:c,className:n="",...i}){const a={error:"bg-red-50 border-red-200 text-red-700",warning:"bg-yellow-50 border-yellow-200 text-yellow-700",info:"bg-blue-50 border-blue-200 text-blue-700",success:"bg-green-50 border-green-200 text-green-700"},l={error:o,warning:x,info:f,success:d}[r];return e.jsxs("div",{className:`p-4 border rounded-lg flex items-start gap-3 ${a[r]} ${n}`,...i,children:[e.jsx(l,{className:"w-5 h-5 flex-shrink-0 mt-0.5"}),e.jsx("div",{className:"flex-1 text-sm",children:s}),c&&e.jsx("button",{onClick:c,className:"flex-shrink-0 text-current opacity-70 hover:opacity-100",children:e.jsx(o,{className:"w-4 h-4"})})]})}export{p as A};
