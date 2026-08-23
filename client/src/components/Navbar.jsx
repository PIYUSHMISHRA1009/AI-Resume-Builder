import React from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {useSelector,useDispatch} from 'react-redux'
import { BarChart2, FileText } from 'lucide-react'


const Navbar=()=>{
    const {user}=useSelector(state=>state.auth)
    const dispatch =useDispatch()


    const navigate=useNavigate()
    const logoutUser=()=>{
        navigate('/')
    }
    return(
        <div className="shadow-sm bg-white border-b border-slate-200">
            <nav className='flex items-center justify-between max-w-7xl mx-auto px-4 py-3.5
            text-slate-800 transition-all'>
                <div className="flex items-center gap-8">
                    <Link to='/'>
                    <img src="/logo.svg" alt="logo" className="h-10 w-auto" />
                    </Link>

                    {user && (
                        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
                            <Link to="/app" className="hover:text-blue-600 flex items-center gap-1.5 transition">
                                <FileText className="w-4 h-4" /> Resumes
                            </Link>
                            <Link to="/app/analytics" className="hover:text-blue-600 flex items-center gap-1.5 font-semibold text-blue-600 transition">
                                <BarChart2 className="w-4 h-4" /> Career Analytics
                            </Link>
                        </div>
                    )}
                </div>

                <div className='flex items-center gap-4 text-sm'>
                    <p className='max-sm:hidden font-medium text-slate-700'> Hi, {user?.name}</p>
                    <button onClick={logoutUser} className='bg-white hover:bg-slate-50 border
                    border-slate-300 px-5 py-1.5 rounded-full text-slate-700 active:scale-95 transition-all font-medium'>Logout</button>
                </div>
            </nav>

        </div>
    )
}

export default Navbar