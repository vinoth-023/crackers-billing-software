import React,{useEffect,useState} from 'react';
import {doc,getDoc} from 'firebase/firestore';
import {Phone} from 'lucide-react';
import {db} from '../../services/firebase';
export function EmergencyCallView(){const [number,setNumber]=useState('');useEffect(()=>{getDoc(doc(db,'settings','emergency')).then(s=>setNumber(s.data()?.emergencyContactNumber||''));},[]);return <div className="flex h-full items-center justify-center p-6"><button disabled={!number} onClick={()=>{window.location.href=`tel:${number}`}} className="flex items-center gap-3 rounded-2xl bg-rose-600 px-8 py-5 text-xl font-bold text-white disabled:opacity-40"><Phone/>Call Emergency {number&&`(${number})`}</button></div>}
