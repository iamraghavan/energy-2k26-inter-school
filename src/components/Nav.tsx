import { Monitor, Shield, Trophy } from 'lucide-react'
import { NavLink } from 'react-router-dom'
export function Nav(){return <nav className="app-nav"><a className="brand" href="/display"><span><Trophy size={20}/></span> EGS LIVE</a><div><NavLink to="/display"><Monitor size={16}/>Display</NavLink><NavLink to="/scorer"><Trophy size={16}/>Scorer</NavLink><NavLink to="/admin"><Shield size={16}/>Admin</NavLink></div></nav>}
