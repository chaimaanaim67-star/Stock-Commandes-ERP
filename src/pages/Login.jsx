import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoIsmawood from "../assets/Logo-ISMAWOOD.png";
import api from '../api/axiosConfig'; 

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    // Ila kant deja m-connectya, tsiftha l-page dyalha nichan
    if (token && role) {
      redirectByRole(role.toLowerCase());
    }
  }, []);

  // Fonction Bach t-farqi bin les roles f redirection
  const redirectByRole = (role) => {
    if (!role) return;
    const r = role.toLowerCase();
    if (r === 'directeur') {
      navigate('/directeur');
    } else     if (r === 'admin' || r === 'it') {
      navigate('/admin-dashboard');
    } else if (r === 'commerciale' || r === 'commercial') {
      navigate('/commercial-view');
    } else if (r === 'stock') {
      navigate('/stock-view');
    } else {
      navigate('/dashboard'); // Page par défaut
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);
  try {
    const response = await api.post('/api/users/login', { username, password });
    
    // Hna fin k-i-tra l-mouchkil (reading 'role')
    // Ghadi n-asta3mlo "?" bach ma-i-t-plantach l-code
    const data = response.data;
    const token = data?.token;
    const role = data?.role; 

    if (token && role) {
      localStorage.setItem('token', token);
      localStorage.setItem('role', role.toLowerCase());
      localStorage.setItem('username', username);
      
      redirectByRole(role);
    } else {
      console.log("Data reçue incomplète:", data);
      setError("Erreur : Les informations du rôle sont manquantes.");
    }

  } catch (err) {
    setError(err.response?.data?.message || 'Erreur de connexion');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4 font-sans text-[#4B3621]">
      <div className="w-full max-w-[950px] bg-white rounded-[40px] shadow-2xl shadow-[#4B3621]/5 flex flex-col md:flex-row overflow-hidden border border-[#E8E2DC]">
        
        {/* Left Side: Branding */}
        <div className="md:w-[40%] bg-[#4B3621] p-10 flex flex-col justify-between relative">
          <div className="relative z-10">
            <img 
              src={logoIsmawood} 
              alt="Ismawood" 
              className="h-16 w-auto mb-8 object-contain bg-white/10 p-2 rounded-xl" 
            />
            <h1 className="text-4xl font-black text-white leading-tight uppercase tracking-tighter">
              Pilotage <br/> 
              <span className="text-[#9DC183]">Industriel</span>
            </h1>
            <p className="text-white/40 font-bold text-[10px] mt-4 uppercase tracking-[0.3em]">
              Ismawood Decision System 
            </p>
          </div>
          
          <div className="relative z-10 bg-white/5 p-6 rounded-[30px] backdrop-blur-sm border border-white/10">
            <p className="text-white/60 text-xs font-medium leading-relaxed italic">
              Pilotage en temps réel pour une meilleure performance.
            </p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-[60%] p-10 md:p-16 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Connexion</h2>
            <div className="h-1.5 w-10 bg-[#9DC183] rounded-full"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-4">Identifiant</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-300 group-focus-within:text-[#9DC183] transition-colors">
                    <User size={16} />
                  </div>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#F9F7F5] border-none py-4 pl-12 pr-6 rounded-[20px] font-bold text-[#4B3621] outline-none focus:ring-2 ring-[#9DC183] transition-all"
                    placeholder="Identifiant"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-4">Mot de passe</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-300 group-focus-within:text-[#9DC183] transition-colors">
                    <Lock size={16} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#F9F7F5] border-none py-4 pl-12 pr-12 rounded-[20px] font-bold text-[#4B3621] outline-none focus:ring-2 ring-[#9DC183] transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-[#9DC183]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#9DC183] text-[#4B3621] py-4 rounded-[20px] font-black text-xs uppercase tracking-widest shadow-lg shadow-[#9DC183]/20 hover:bg-[#4B3621] hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Vérification...' : 'Accéder au Portail'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </form>

          <div className="mt-10 pt-6 border-t border-gray-50 text-center text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em]">
            © 2026 Ismawood Decision System 
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
