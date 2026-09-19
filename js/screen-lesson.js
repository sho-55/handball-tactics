// Floor guides explain the screen; they are instructional marks, not extra players.
export function makeScreenLesson(T,scene){
  const root=new T.Group();scene.add(root);
  const ring=new T.Mesh(new T.RingGeometry(.42,.50,40),new T.MeshBasicMaterial({color:0x277cc4,side:T.DoubleSide,transparent:true,opacity:.85}));
  ring.rotation.x=-Math.PI/2;root.add(ring);
  const seal=new T.Mesh(new T.BoxGeometry(1.1,.035,.18),new T.MeshBasicMaterial({color:0xffca55}));root.add(seal);
  const arrow=color=>{const a=new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(),1,color,.28,.18);root.add(a);return a;};
  const enter=arrow(0x318edf),blocked=arrow(0xe78732),shot=arrow(0x3caa70);
  const place=(a,from,to)=>{const dir=new T.Vector3(to.x-from.x,0,to.y-from.y),len=dir.length();a.visible=len>.2;a.position.set(from.x,.075,from.y);a.setDirection(dir.normalize());a.setLength(Math.max(.2,len),.25,.16);};
  return {root,update(st,t,lesson,learning){
    root.visible=!!lesson&&learning&&t>=lesson.start&&t<=lesson.end;if(!root.visible)return;
    const at={x:lesson.at[0],y:lesson.at[1]},b=st.pos[lesson.blocker],d=st.pos[lesson.defender];
    ring.position.set(b.x,.04,b.y);seal.position.set(at.x,.055,at.y);
    seal.rotation.y=-Math.atan2(at.y-d.y,at.x-d.x)+Math.PI/2;
    place(enter,b,at);enter.visible=enter.visible&&t<lesson.arrive;
    const toward={x:d.x+(at.x-d.x)*.65,y:d.y+(at.y-d.y)*.65};place(blocked,d,toward);
    place(shot,st.pos[lesson.shooter],{x:10,y:0});shot.visible=t>=lesson.shot-.2;
  }};
}
