import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Admin } from './pages/Admin'
import { Display } from './pages/Display'
import { Scorer } from './pages/Scorer'
import './styles.css'
import './display.css'
export default function App(){return <BrowserRouter><Routes><Route path="/display" element={<Display/>}/><Route path="/scorer" element={<Scorer/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<Navigate to="/display" replace/>}/></Routes></BrowserRouter>}
