// Self-contained geometry: no external models, textures or audio downloads.
import * as T from '../vendor/three-0.170.0.module.min.js';
export { T };
const materials = new Map(), geometries = new Map();
export function material(color, roughness = .65) {
  const key = `${color}/${roughness}`;
  if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness }));
  return materials.get(key);
}
function geo(key, create) { if (!geometries.has(key)) geometries.set(key, create()); return geometries.get(key); }
export function mesh(parent, geometry, mat, x=0, y=0, z=0) {
  const m = new T.Mesh(geometry, mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
export function box(parent, w,h,d, color,x,y,z) {
  const m=mesh(parent,geo('box',()=>new T.BoxGeometry(1,1,1)),typeof color==='number'?material(color):color,x,y,z); m.scale.set(w,h,d); return m;
}
function sphere(parent,r,color,x,y,z) {
  const m=mesh(parent,geo('sphere',()=>new T.SphereGeometry(1,12,10)),typeof color==='number'?material(color):color,x,y,z); m.scale.setScalar(r); return m;
}
function cylinder(parent,top,bottom,h,color,x,y,z) {
  return mesh(parent,geo(`c${top},${bottom},${h}`,()=>new T.CylinderGeometry(top,bottom,h,12)),typeof color==='number'?material(color):color,x,y,z);
}
function rod(parent,a,b,r,color) {
  const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);
  const m=cylinder(parent,r,r,d.length(),color,...av.clone().add(bv).multiplyScalar(.5).toArray());
  m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()); return m;
}
function canvasTexture(w,h,paint) {
  const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
function floorTexture() {
  return canvasTexture(1536,2560,(g,w,h)=>{
    let seed=35;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    g.fillStyle='#c79e65';g.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=22) for(let x=-((y/22)%3)*105;x<w;x+=310){
      const light=61+rand()*12;g.fillStyle=`hsl(35 43% ${light}%)`;g.fillRect(x+1,y+1,308,20);
      g.strokeStyle=`rgba(92,58,29,${.035+rand()*.06})`;g.lineWidth=.7;
      for(let k=0;k<6;k++){g.beginPath();g.moveTo(x,y+3+k*3);g.bezierCurveTo(x+90,y+k*3,x+220,y+8+k*2,x+307,y+3+k*3);g.stroke();}
    }
    g.save();g.scale(w/26,h/48);g.translate(3,4);
    function area(far=false){g.save();if(far){g.translate(20,40);g.rotate(Math.PI);}
      const path=(r)=>{g.beginPath();g.moveTo(8.5-r,0);g.arc(8.5,0,r,Math.PI,Math.PI/2,true);g.lineTo(11.5,r);g.arc(11.5,0,r,Math.PI/2,0,true);};
      path(6);g.closePath();g.fillStyle='rgba(49,116,118,.75)';g.fill();
      path(6);g.strokeStyle='#fff9e7';g.lineWidth=.065;g.stroke();
      g.save();g.beginPath();g.rect(0,0,20,40);g.clip();path(9);g.setLineDash([.15,.15]);g.stroke();g.restore();
      g.beginPath();g.moveTo(9.5,7);g.lineTo(10.5,7);g.moveTo(9.85,4);g.lineTo(10.15,4);g.stroke();g.restore();
    }
    area();area(true);g.strokeStyle='#fff9e7';g.lineWidth=.065;g.strokeRect(0,0,20,40);
    g.beginPath();g.moveTo(0,20);g.lineTo(20,20);g.arc(10,20,2,0,Math.PI*2);g.stroke();
    g.fillStyle='rgba(38,65,54,.25)';g.textAlign='center';g.font='bold .62px sans-serif';g.fillText('HANDBALL',10,18.5);g.restore();
  });
}
function sign(parent,text,w,h,x,y,z,color='#183f3b') {
  const tex=canvasTexture(512,160,(g,W,H)=>{g.fillStyle=color;g.fillRect(0,0,W,H);g.fillStyle='#faf8e7';g.font='bold 50px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,W/2,H/2);});
  return mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex}),x,y,z);
}
function goal(parent,z,rot=0){
  const root=new T.Group();root.position.set(10,0,z);root.rotation.y=rot;parent.add(root);
  for(const x of [-1.5,1.5])for(let i=0;i<10;i++)box(root,.08,.2,.08,i%2?0xf8f7e8:0xb92e28,x,.1+i*.2,0);
  for(let i=0;i<15;i++)box(root,.2,.08,.08,i%2?0xf8f7e8:0xb92e28,-1.4+i*.2,2,0);
  rod(root,[-1.5,0,-1],[-1.5,2,0],.025,0x6e797a);rod(root,[1.5,0,-1],[1.5,2,0],.025,0x6e797a);
  const pts=[];const line=(a,b)=>pts.push(...a,...b);
  for(let x=-1.5;x<=1.51;x+=.12){line([x,0,-1],[x,2,-.7]);line([x,2,-.7],[x,2,0]);}
  for(let y=0;y<=2.01;y+=.12){const z=-1+y*.15;line([-1.5,y,z],[1.5,y,z]);line([-1.5,y,z],[-1.5,y,0]);line([1.5,y,z],[1.5,y,0]);}
  for(let z=-.96;z<0;z+=.12){line([-1.5,0,z],[-1.5,2,z*.7]);line([1.5,0,z],[1.5,2,z*.7]);}
  const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(pts,3));
  root.add(new T.LineSegments(geom,new T.LineBasicMaterial({color:0xeaf0e2,transparent:true,opacity:.6})));
}
export function buildGym(scene,renderer){
  scene.background=new T.Color(0xdce7e3);scene.fog=new T.Fog(0xdce7e3,30,67);
  scene.add(new T.HemisphereLight(0xe9f5ff,0xc99d62,2.0));
  const sun=new T.DirectionalLight(0xfff1d5,2.4);sun.position.set(-8,16,8);sun.target.position.set(10,0,8);scene.add(sun,sun.target);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-19,right:19,top:18,bottom:-18,near:1,far:60});sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.045;sun.shadow.bias=-.0003;
  const fill=new T.DirectionalLight(0xcdeaff,.8);fill.position.set(24,10,-3);scene.add(fill);
  const tex=floorTexture();tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const floor=mesh(scene,new T.PlaneGeometry(26,48),new T.MeshStandardMaterial({map:tex,roughness:.31,metalness:.07}),10,-.015,20);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  for(const x of [-3,23]){
    box(scene,.25,9,48,0xe2e4d8,x,4.5,20);box(scene,.28,2.3,48,0x987d5c,x,1.15,20);
    for(let z=-1;z<44;z+=5){
      box(scene,.34,8,.24,0xc7c9be,x,4,z);
      const glass= new T.MeshStandardMaterial({color:0xc5e6e9,emissive:0x8ebfc7,emissiveIntensity:.4,roughness:.25});
      box(scene,.3,2.1,3.8,glass,x,5.8,z+2.1);
      box(scene,.34,.09,3.9,0xf8f6e7,x,5.8,z+2.1);box(scene,.34,2.1,.08,0xf8f6e7,x,5.8,z+2.1);
    }
  }
  for(const z of [-4,44]){box(scene,26,9,.25,0xe3e5dc,10,4.5,z);box(scene,26,2.3,.28,0x749285,10,1.15,z);}
  box(scene,26,.2,48,0xe4e6df,10,9,20);
  for(let z=-2;z<45;z+=6){
    box(scene,26,.23,.2,0x747f78,10,8.2,z);
    for(let x=-2;x<22;x+=4)rod(scene,[x,8.2,z],[x+2,8.85,z],.045,0x919d94);
    for(const x of [3,10,17])box(scene,1.8,.08,.7,new T.MeshStandardMaterial({color:0xffffff,emissive:0xfff9dc,emissiveIntensity:2}),x,8.05,z+1.5);
  }
  for(const x of [-1.9,21.9])for(const z of [8,17,29]){
    box(scene,.65,.12,3.8,0xa36c39,x,.55,z);box(scene,.1,.65,3.8,0xad7d4a,x+(x<0?-.3:.3),.9,z);
    for(const dz of [-1.4,1.4])box(scene,.55,.48,.08,0x485853,x,.25,z+dz);
  }
  for(const x of [2,18]){box(scene,1.5,2.5,.08,0x38554c,x,1.25,-3.8);box(scene,.1,.2,.1,0xc8d5ca,x+.45,1.2,-3.72);}
  sign(scene,'HANDBALL TACTICS',5.5,.9,10,4.6,-3.82);
  sign(scene,'HOME    00 : 00    GUEST',3.2,.85,10,6.2,-3.8,'#172e2c');
  const clock=cylinder(scene,.48,.48,.06,0xf8f5e8,16,5.2,-3.78);clock.rotation.x=Math.PI/2;
  box(scene,.025,.27,.02,0x304e46,16,5.3,-3.73);box(scene,.19,.025,.02,0x304e46,16.08,5.2,-3.73);
  goal(scene,0);goal(scene,40,Math.PI);
  // Batch repeated, static gym parts to reduce draw calls on phones.
  scene.updateMatrixWorld(true);
  const groups=new Map();
  scene.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+'/'+o.material.uuid;const group=groups.get(key)||[];group.push(o);groups.set(key,group);});
  for(const group of groups.values()){
    if(group.length<2)continue;
    const batch=new T.InstancedMesh(group[0].geometry,group[0].material,group.length);batch.castShadow=true;batch.receiveShadow=true;
    group.forEach((o,i)=>{batch.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();scene.add(batch);
  }
}
export function makeBall(parent){
  const root=new T.Group();parent.add(root);sphere(root,.105,0xe8be40,0,0,0);
  for(let i=0;i<3;i++){const seam=mesh(root,new T.TorusGeometry(.105,.003,4,24),material(0x39474b));seam.rotation.set(i===0?Math.PI/2:0,i===1?Math.PI/2:0,0);}
  return root;
}
export function makeAthlete(scene,id,def,index){
  const root=new T.Group();scene.add(root);const body=new T.Group();root.add(body);
  const skin=[0xd7a27c,0xe1b18a,0xb77f5f,0xeac19a][index%4],shirt=def?0xe57938:0x287ac6,shorts=def?0x3f3531:0x153a60;
  const torso=cylinder(body,.255,.19,.49,shirt,0,1.17,0);torso.scale.z=.64;
  cylinder(body,.07,.085,.12,skin,0,1.46,0);
  const head=sphere(body,.145,skin,0,1.64,0);head.scale.multiply(new T.Vector3(.88,1.12,.92));
  const hair=sphere(body,.147,0x302820,0,1.71,-.018);hair.scale.multiply(new T.Vector3(.9,.65,.93));
  for(const x of [-.048,.048])sphere(body,.012,0x30352d,x,1.65,.124);
  sphere(body,.026,skin,0,1.61,.136);
  cylinder(body,.195,.2,.2,shorts,0,.84,0).scale.z=.73;
  const limbs={};
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.255,1.36,0);body.add(arm);
    cylinder(arm,.09,.075,.19,shirt,0,-.075,0);
    cylinder(arm,.07,.058,.23,skin,0,-.20,0);
    const elbow=new T.Group();elbow.position.y=-.31;arm.add(elbow);
    sphere(elbow,.06,skin,0,0,0);cylinder(elbow,.057,.041,.25,skin,0,-.115,0);
    const hand=sphere(elbow,.06,skin,0,-.26,0);hand.scale.multiply(new T.Vector3(.75,1.15,.5));
    const leg=new T.Group();leg.position.set(side*.115,.81,0);body.add(leg);
    cylinder(leg,.105,.09,.23,shorts,0,-.10,0);cylinder(leg,.085,.064,.23,skin,0,-.27,0);
    const knee=new T.Group();knee.position.y=-.38;leg.add(knee);
    sphere(knee,.067,skin,0,0,0);cylinder(knee,.066,.044,.30,skin,0,-.145,0);
    cylinder(knee,.048,.05,.14,0xf1eee0,0,-.28,0);
    box(knee,.13,.09,.27,0xf3f0e5,0,-.35,.06);box(knee,.135,.025,.28,0x34413c,0,-.395,.06);
    box(knee,.137,.03,.12,shirt,0,-.35,.08);
    limbs[side]={arm,elbow,leg,knee};
  }
  // Jersey markings on both sides of the actual mesh.
  const tex=canvasTexture(128,128,(g)=>{g.clearRect(0,0,128,128);g.fillStyle='#fff';g.font='bold 53px sans-serif';g.textAlign='center';g.fillText(id,64,73);g.font='13px sans-serif';g.fillText(def?'DEFENCE':'HANDBALL',64,100);});
  for(const side of [-1,1]){const number=mesh(body,new T.PlaneGeometry(.28,.28),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}),0,1.2,side*.165);if(side<0)number.rotation.y=Math.PI;}
  const ring=mesh(root,new T.RingGeometry(.36,.42,32),new T.MeshBasicMaterial({color:0xe6f784,side:T.DoubleSide,transparent:true,opacity:.9}),0,.018,0);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
  return {root,body,limbs,ring,def};
}
export function poseAthlete(model,{moving,phase,holding,throwing,receiving}){
  const stride=moving?Math.sin(phase)*.55:0;
  model.body.position.y=model.def?-.08:0; // Keep the viewer camera entirely steady.
  for(const side of [-1,1]){
    const l=model.limbs[side];l.leg.rotation.x=side*stride;l.leg.rotation.z=model.def?side*.16:side*.03;
    l.knee.rotation.x=moving?Math.max(0,-side*stride)*1.1:.12;
    l.arm.rotation.set(-side*stride*.65,0,side*(model.def?.72:.12));l.elbow.rotation.x=-.28;
    if(model.def){l.arm.rotation.x=-.4;l.elbow.rotation.x=-.75;}
    if(holding||receiving){l.arm.rotation.x=-.65;l.arm.rotation.z=side*.1;l.elbow.rotation.x=-.95;}
    if(throwing!==null&&side===1){l.arm.rotation.x=-2.2+throwing*1.1;l.arm.rotation.z=-.25;l.elbow.rotation.x=-.7+throwing*.5;}
  }
}
export function makeHands(camera){
  const root=new T.Group();camera.add(root);root.position.set(0,-.32,-.65);
  for(const side of [-1,1]){
    rod(root,[side*.33,-.25,.25],[side*.15,0,0],.045,0xdfad85);
    const palm=sphere(root,.06,0xdfad85,side*.12,.015,0);palm.scale.multiply(new T.Vector3(.65,1,.48));palm.rotation.z=-side*.4;
    for(let i=0;i<4;i++){const finger=sphere(root,.018,0xdfad85,side*(.085+i*.016),.052,-.027+i*.007);finger.scale.multiply(new T.Vector3(.7,1.7,.65));}
    box(root,.13,.10,.14,0x287ac6,side*.31,-.21,.22);
  }
  const ball=makeBall(root);ball.position.set(0,.025,-.015);
  root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  return root;
}
