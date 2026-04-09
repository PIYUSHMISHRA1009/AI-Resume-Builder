import React,{useEffect} from 'react';

import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Layout from './pages/Layout'
import ResumeBuilder from './pages/ResumeBuilder'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Preview from './pages/Preview'
import {useDispatch} from 'react-redux'
import api from './configs/api'
import {login,setLoading} from './app/features/authSlice'
import {Toaster} from 'react-hot-toast'


const App = () => {

  const dispatch=useDispatch()

  const getUserData= async()=>{
    const token=localStorage.getItem('token')
    try{
      if(token){
        const{data} =await api.get('/api/users/data',{headers:{
          Authorization:token
        }})
        if(data.user){
          dispatch(login({token,user:data.user}))
        }
        dispatch(setLoading(false))
      }
      else{
        dispatch(setLoading(false))
      }
    } catch(error){
      dispatch(setLoading(false))
      console.log(error.message)
    }
  }
  
  useEffect(()=>{
    getUserData()
  },[])

  return (
    <>
    <Toaster />
    <Routes>
      <Route path="/" element={<Home />} />

      {/* because we will use subroutes here */}
      <Route path="/app" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="builder/:resumeId" element={<ResumeBuilder />} />
      </Route>

      <Route path="view/:resumeId" element={<Preview />} />
      <Route path="login" element={<Login />} />
    </Routes>
    </>
  )
}

export default App