import axios from 'axios';

const API_URL = 'http://localhost:5000/api/users'; 

const authService = {
 // ... f west authService
login: async (username, password) => { // Beddli 'email' b 'username'
  try {
    // Sifti 'username' nichan kif kiy-t-sennah l-Backend
    const response = await axios.post(`${API_URL}/login`, { username, password });
    
    if (response.data.token || response.data.role) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error("Erreur de connexion");
  }
},

  // Fonction dial logout
  logout: () => {
    localStorage.removeItem('user');
  },

  // Fonction bash n-shoufo l-user li dakhil daba
  getCurrentUser: () => {
    return JSON.parse(localStorage.getItem('user'));
  }
};

export default authService;