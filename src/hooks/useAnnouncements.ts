import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export type Announcement={id:string;message:string;active:boolean;priority:number;created_at:string;updated_at:string}
export function useAnnouncements(){
 const[announcements,setAnnouncements]=useState<Announcement[]>([]),[loading,setLoading]=useState(isSupabaseConfigured)
 const refresh=useCallback(async()=>{if(!isSupabaseConfigured){setLoading(false);return}const{data}=await supabase.from('announcements').select('*').order('priority',{ascending:false}).order('created_at',{ascending:false});if(data)setAnnouncements(data);setLoading(false)},[])
 useEffect(()=>{refresh();if(!isSupabaseConfigured)return;const channel=supabase.channel('tournament-announcements').on('postgres_changes',{event:'*',schema:'public',table:'announcements'},refresh).subscribe();return()=>{supabase.removeChannel(channel)}},[refresh])
 return{announcements,loading,refresh}
}
