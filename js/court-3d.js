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
  const m=mesh(parent,geo('sphere',()=>new T.SphereGeometry(1,20,14)),typeof color==='number'?material(color):color,x,y,z); m.scale.setScalar(r); return m;
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
    for(let y=0;y<h;y+=13) for(let x=-((y/13)%3)*57;x<w;x+=171){
      const light=66+rand()*6;g.fillStyle=`hsl(34 34% ${light}%)`;g.fillRect(x+.4,y+.35,170.6,12.65);
      g.strokeStyle=`rgba(92,58,29,${.035+rand()*.06})`;g.lineWidth=.7;
      for(let k=0;k<8;k++){g.beginPath();g.moveTo(x,y+1+k*1.5);g.bezierCurveTo(x+50,y+k*1.5,x+120,y+3+k*1.3,x+170,y+1+k*1.5);g.stroke();}
    }
    for(let i=0;i<1800;i++){g.strokeStyle='rgba(66,47,29,.035)';const x=rand()*w,y=rand()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x+rand()*18,y+rand()*2);g.stroke();}
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
// Baked soft contacts and a low-resolution indoor reflection environment.
let grainTexture,contactTexture,ballSurface;
function noiseTexture(){
  if(!grainTexture){grainTexture=canvasTexture(128,128,(g,w,h)=>{let n=81;const data=g.createImageData(w,h);for(let i=0;i<data.data.length;i+=4){n=(n*1664525+1013904223)>>>0;const c=115+(n%35);data.data[i]=data.data[i+1]=data.data[i+2]=c;data.data[i+3]=255;}g.putImageData(data,0,0);});grainTexture.colorSpace=T.NoColorSpace;grainTexture.wrapS=grainTexture.wrapT=T.RepeatWrapping;}
  return grainTexture;
}
function fabricMaterial(color){const key='fabric'+color;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.88,bumpMap:noiseTexture(),bumpScale:.002}));return materials.get(key);}
function surfaceMaterial(color){const key='wall'+color;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.93,bumpMap:noiseTexture(),bumpScale:.015}));return materials.get(key);}
function contactShadow(parent,rx,rz){
  if(!contactTexture)contactTexture=canvasTexture(64,64,(g)=>{const a=g.createRadialGradient(32,32,2,32,32,31);a.addColorStop(0,'rgba(26,30,24,.40)');a.addColorStop(.45,'rgba(26,30,24,.20)');a.addColorStop(1,'rgba(26,30,24,0)');g.fillStyle=a;g.fillRect(0,0,64,64);});
  const shadow=mesh(parent,geo('contact',()=>new T.PlaneGeometry(1,1)),new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),0,.009,0);shadow.rotation.x=-Math.PI/2;shadow.scale.set(rx*2,rz*2,1);shadow.castShadow=shadow.receiveShadow=false;
}
function ballMaterial(){
  if(!ballSurface){const tex=canvasTexture(256,128,(g,w,h)=>{g.fillStyle='#dab24f';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){g.fillStyle=(x+y)%8?'#e7c368':'#c39a3f';g.beginPath();g.arc(x+1,y+1,.8,0,7);g.fill();}g.fillStyle='#284b53';g.font='bold 18px sans-serif';g.textAlign='center';g.fillText('HANDBALL',128,65);});ballSurface=new T.MeshStandardMaterial({map:tex,roughness:.76,bumpMap:noiseTexture(),bumpScale:.001});}return ballSurface;
}
function addEnvironment(scene,renderer){
  const room=new T.Scene();room.background=new T.Color(0x626e75);
  mesh(room,new T.BoxGeometry(26,10,48),new T.MeshBasicMaterial({color:0xb7bdb7,side:T.BackSide}),0,0,0);
  const glow=new T.MeshBasicMaterial({color:new T.Color(3,3,2.8)});
  for(const x of [-8,0,8])box(room,2,.05,20,glow,x,4.8,0);
  for(const x of [-12.8,12.8])box(room,.05,2,30,new T.MeshBasicMaterial({color:new T.Color(1.8,2.1,2.3)}),x,1,0);
  const generator=new T.PMREMGenerator(renderer),target=generator.fromScene(room,.05,.1,80);scene.environment=target.texture;scene.environmentIntensity=.35;
  scene.userData.reflectionTarget=target;generator.dispose();
  // Shared geometry/material caches remain live for the main scene.
}
function addGymDetails(scene){
  // Wall padding, wood slats, ventilation, high windows and folded court equipment.
  for(const x of [-2.82,22.82]){
    for(let z=-2;z<44;z+=1.15)box(scene,.025,2.05,.027,0x6f6755,x,1.1,z);
    for(const z of [2,20,37]){
      box(scene,.06,.7,2,0x6c7d76,x,3.25,z);
      for(let k=0;k<6;k++)box(scene,.08,.025,1.8,0xc7d0c8,x+(x<0?.035:-.035),3+k*.09,z);
    }
  }
  for(let x=-2;x<23;x+=1.2)box(scene,.022,2.2,.03,0x547469,x,1.1,-3.82);
  for(const x of [3.7,16.3]){
    box(scene,1.1,2.2,.18,fabricMaterial(0x365b67),x,1.1,-3.66);
    for(let y=.2;y<2.2;y+=.4)box(scene,1.08,.012,.015,0x729099,x,y,-3.56);
  }
  sign(scene,'EXIT',.7,.28,2,2.85,-3.70,'#35704e');sign(scene,'EXIT',.7,.28,18,2.85,-3.70,'#35704e');
  for(const z of [9,18,30]){
    const bag=sphere(scene,1,fabricMaterial(0x24384a),21.9,.78,z);bag.scale.set(.27,.2,.38);
    box(scene,.06,.25,.05,0x15292d,21.9,1,z);
    cylinder(scene,.04,.04,.24,0x638e92,21.65,.74,z+.6);
  }
  // Subtle, precomputed daylight pools: no extra dynamic shadow passes.
  const glow=canvasTexture(128,128,(g)=>{const a=g.createRadialGradient(64,64,8,64,64,63);a.addColorStop(0,'rgba(255,248,218,.20)');a.addColorStop(1,'rgba(255,248,218,0)');g.fillStyle=a;g.fillRect(0,0,128,128);});
  for(const z of [3,10,17,24,31,38]){
    const patch=mesh(scene,new T.PlaneGeometry(9,3.2),new T.MeshBasicMaterial({map:glow,transparent:true,depthWrite:false}),2,.003,z);patch.rotation.x=-Math.PI/2;patch.rotation.z=-.3;patch.castShadow=patch.receiveShadow=false;
  }
}
export function buildGym(scene,renderer){
  scene.background=new T.Color(0xdce7e3);scene.fog=new T.Fog(0xdce7e3,30,67);
  scene.add(new T.HemisphereLight(0xe9f2ff,0x858b80,1.25));
  addEnvironment(scene,renderer);
  const sun=new T.DirectionalLight(0xfff2dd,2.9);sun.position.set(1,8,3);sun.target.position.set(13,0,12);scene.add(sun,sun.target);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-19,right:19,top:18,bottom:-18,near:1,far:60});sun.shadow.mapSize.set(1536,1536);sun.shadow.normalBias=.025;sun.shadow.bias=-.0003;
  const fill=new T.DirectionalLight(0xcdeaff,.65);fill.position.set(20,7,10);scene.add(fill);
  const tex=floorTexture();tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const floor=mesh(scene,new T.PlaneGeometry(26,48),new T.MeshPhysicalMaterial({map:tex,roughness:.34,metalness:0,clearcoat:.28,clearcoatRoughness:.28,envMapIntensity:.25}),10,-.015,20);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  for(const x of [-3,23]){
    box(scene,.25,9,48,surfaceMaterial(0xe2e4d8),x,4.5,20);box(scene,.28,2.3,48,0x987d5c,x,1.15,20);
    for(let z=-1;z<44;z+=5){
      box(scene,.34,8,.24,0xc7c9be,x,4,z);
      const glass= new T.MeshStandardMaterial({color:0xc5e6e9,emissive:0x8ebfc7,emissiveIntensity:.4,roughness:.25});
      box(scene,.3,2.1,3.8,glass,x,5.8,z+2.1);
      box(scene,.34,.09,3.9,0xf8f6e7,x,5.8,z+2.1);box(scene,.34,2.1,.08,0xf8f6e7,x,5.8,z+2.1);
    }
  }
  for(const z of [-4,44]){box(scene,26,9,.25,surfaceMaterial(0xe3e5dc),10,4.5,z);box(scene,26,2.3,.28,0x749285,10,1.15,z);}
  box(scene,26,.2,48,surfaceMaterial(0xe4e6df),10,9,20);
  for(let z=-3;z<44;z+=1.6)box(scene,26,.015,.035,0xb6beb8,10,8.88,z);
  addGymDetails(scene);
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
  scene.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+'/'+o.material.uuid+'/'+o.castShadow+'/'+o.receiveShadow;const group=groups.get(key)||[];group.push(o);groups.set(key,group);});
  for(const group of groups.values()){
    if(group.length<2)continue;
    const batch=new T.InstancedMesh(group[0].geometry,group[0].material,group.length);batch.castShadow=group[0].castShadow;batch.receiveShadow=group[0].receiveShadow;
    group.forEach((o,i)=>{batch.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();scene.add(batch);
  }
}
export function makeBall(parent){
  const root=new T.Group();parent.add(root);sphere(root,.105,ballMaterial(),0,0,0);
  for(let i=0;i<3;i++){const seam=mesh(root,new T.TorusGeometry(.105,.003,4,24),material(0x39474b));seam.rotation.set(i===0?Math.PI/2:0,i===1?Math.PI/2:0,0);}
  return root;
}
export function makeAthlete(scene,id,def,index){
  const root=new T.Group();scene.add(root);const body=new T.Group();root.add(body);
  contactShadow(root,.65,.47);
  const skin=[0xd7a27c,0xe1b18a,0xb77f5f,0xeac19a][index%4],shirt=def?0xe57938:0x287ac6,shorts=def?0x3f3531:0x153a60;
  const torso=mesh(body,geo('jersey',()=>new T.LatheGeometry([new T.Vector2(.19,0),new T.Vector2(.2,.1),new T.Vector2(.23,.32),new T.Vector2(.255,.43),new T.Vector2(.18,.49)],20)),fabricMaterial(shirt),0,.925,0);torso.scale.z=.66;
  const collar=mesh(body,new T.TorusGeometry(.083,.012,6,20),material(0xf0efe6),0,1.43,0);collar.rotation.x=Math.PI/2;
  cylinder(body,.07,.085,.12,skin,0,1.46,0);
  const head=sphere(body,.121,skin,0,1.64,0);head.scale.multiply(new T.Vector3(.88,1.12,.92));
  const hair=sphere(body,.123,0x302820,0,1.70,-.012);hair.scale.multiply(new T.Vector3(.9,.65,.93));
  for(const x of [-.04,.04])sphere(body,.008,0x30352d,x,1.65,.104);
  sphere(body,.017,skin,0,1.615,.112);
  for(const x of [-.111,.111]){const ear=sphere(body,.028,skin,x,1.63,0);ear.scale.multiply(new T.Vector3(.45,1,.7));}
  const mouth=box(body,.042,.006,.005,0x8c5849,0,1.587,.107);
  cylinder(body,.195,.2,.2,shorts,0,.84,0).scale.z=.73;
  const limbs={};
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.255,1.36,0);body.add(arm);
    cylinder(arm,.09,.075,.19,fabricMaterial(shirt),0,-.075,0);
    cylinder(arm,.07,.058,.23,skin,0,-.20,0);
    const elbow=new T.Group();elbow.position.y=-.31;arm.add(elbow);
    sphere(elbow,.06,skin,0,0,0);cylinder(elbow,.057,.041,.25,skin,0,-.115,0);
    const hand=sphere(elbow,.06,skin,0,-.26,0);hand.scale.multiply(new T.Vector3(.75,1.15,.5));
    const leg=new T.Group();leg.position.set(side*.115,.81,0);body.add(leg);
    cylinder(leg,.105,.09,.23,shorts,0,-.10,0);cylinder(leg,.085,.064,.23,skin,0,-.27,0);
    const knee=new T.Group();knee.position.y=-.38;leg.add(knee);
    sphere(knee,.067,skin,0,0,0);cylinder(knee,.066,.044,.30,skin,0,-.145,0);
    cylinder(knee,.048,.05,.14,0xf1eee0,0,-.28,0);
    const shoe=sphere(knee,1,0xe8e9e0,0,-.345,.06);shoe.scale.set(.073,.063,.145);const sole=box(knee,.135,.025,.28,0x34413c,0,-.395,.06);
    box(knee,.137,.03,.12,shirt,0,-.35,.08);
    limbs[side]={arm,elbow,leg,knee,sole};
  }
  // Jersey markings on both sides of the actual mesh.
  const tex=canvasTexture(128,128,(g)=>{g.clearRect(0,0,128,128);g.fillStyle='#fff';g.font='bold 53px sans-serif';g.textAlign='center';g.fillText(id,64,73);g.font='13px sans-serif';g.fillText(def?'DEFENCE':'HANDBALL',64,100);});
  for(const side of [-1,1]){const number=mesh(body,new T.PlaneGeometry(.28,.28),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}),0,1.2,side*.165);if(side<0)number.rotation.y=Math.PI;}
  const ring=mesh(root,new T.RingGeometry(.36,.42,32),new T.MeshBasicMaterial({color:0xe6f784,side:T.DoubleSide,transparent:true,opacity:.9}),0,.018,0);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
  return {root,body,limbs,ring,def,phaseOffset:index*.71};
}
export function poseAthlete(model,{speed,phase,holding,throwing,receiving}){
  const move=T.MathUtils.smoothstep(speed,.02,2.6),stride=Math.sin(phase)*.62*move;
  const crouch=model.def?1:0;
  model.body.position.y=0;
  model.body.rotation.set(.04+move*.055+crouch*.03,throwing===null?Math.sin(phase)*move*.035:Math.sin(throwing*Math.PI)*-.15,Math.sin(phase)*move*.018);
  for(const side of [-1,1]){
    const l=model.limbs[side];
    l.leg.rotation.set(side*stride-crouch*.12,0,side*(.035+crouch*.10));
    l.knee.rotation.x=.09+crouch*.2+Math.max(0,-side*stride)*1.2;
    l.arm.rotation.set(-.12-side*stride*.65,0,side*(model.def?.5:.1));
    l.elbow.rotation.x=-.35-move*.2;
    if(model.def){l.arm.rotation.x=-.55+side*stride*.18;l.elbow.rotation.x=-.95;}
    if(holding||receiving){l.arm.rotation.x=-.62;l.arm.rotation.z=side*.08;l.elbow.rotation.x=-1.0;}
    if(throwing!==null){
      const wind=T.MathUtils.smoothstep(throwing,0,.4),release=T.MathUtils.smoothstep(throwing,.4,.72),settle=T.MathUtils.smoothstep(throwing,.72,1);
      if(side===1){l.arm.rotation.x=-.65-wind*1.6+release*.8+settle*1.25;l.arm.rotation.z=-.22*wind*(1-settle);l.elbow.rotation.x=-1.1+release*.85-settle*.1;}
      else {l.arm.rotation.x=-.6-release*.2+settle*.6;l.elbow.rotation.x=-.5;}
    }
  }
  // Plant the lower supporting sole at floor level, including when the knees bend.
  model.root.updateMatrixWorld(true);
  const foot=new T.Vector3(),heights=[];
  for(const side of [-1,1]){
    const sole=model.limbs[side].sole;
    for(const z of [-.5,.5]){foot.set(0,-.5,z).applyMatrix4(sole.matrixWorld);heights.push(foot.y);}
  }
  model.body.position.y=.008-Math.min(...heights);
}
export function makeHands(camera){
  const root=new T.Group();camera.add(root);root.position.set(0,-.32,-.65);
  for(const side of [-1,1]){
    rod(root,[side*.33,-.25,.25],[side*.15,0,0],.045,0xdfad85);
    const palm=sphere(root,.06,0xdfad85,side*.12,.015,0);palm.scale.multiply(new T.Vector3(.65,1,.48));palm.rotation.z=-side*.4;
    for(let i=0;i<4;i++){const finger=sphere(root,.018,0xdfad85,side*(.085+i*.016),.052,-.027+i*.007);finger.scale.multiply(new T.Vector3(.7,1.7,.65));}
    const sleeve=cylinder(root,.06,.075,.17,fabricMaterial(0x287ac6),side*.31,-.21,.22);
    sleeve.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(-side*.18,.25,-.25).normalize());
  }
  const ball=makeBall(root);ball.position.set(0,.025,-.015);
  root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  return root;
}
