import Layout from "./Layout.jsx";

import Home from "./Home";

import Journal from "./Journal";

import Progress from "./Progress";

import Export from "./Export";

import ExercisesSetup from "./ExercisesSetup";

import Tracking from "./Tracking";

import AdminDashboard from "./AdminDashboard";

import Recipes from "./Recipes";

import UserRegistration from "./UserRegistration";

import CompleteProfile from "./CompleteProfile";

import ExerciseLibrary from "./ExerciseLibrary";

import Contract from "./Contract";

import BoosterEvents from "./BoosterEvents";

import Maintenance from "./Maintenance";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    Journal: Journal,
    
    Progress: Progress,
    
    Export: Export,
    
    ExercisesSetup: ExercisesSetup,
    
    Tracking: Tracking,
    
    AdminDashboard: AdminDashboard,
    
    Recipes: Recipes,
    
    UserRegistration: UserRegistration,
    
    CompleteProfile: CompleteProfile,
    
    ExerciseLibrary: ExerciseLibrary,
    
    Contract: Contract,
    
    BoosterEvents: BoosterEvents,
    
    Maintenance: Maintenance,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Home />} />
                
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Journal" element={<Journal />} />
                
                <Route path="/Progress" element={<Progress />} />
                
                <Route path="/Export" element={<Export />} />
                
                <Route path="/ExercisesSetup" element={<ExercisesSetup />} />
                
                <Route path="/Tracking" element={<Tracking />} />
                
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                
                <Route path="/Recipes" element={<Recipes />} />
                
                <Route path="/UserRegistration" element={<UserRegistration />} />
                
                <Route path="/CompleteProfile" element={<CompleteProfile />} />
                
                <Route path="/ExerciseLibrary" element={<ExerciseLibrary />} />
                
                <Route path="/Contract" element={<Contract />} />
                
                <Route path="/BoosterEvents" element={<BoosterEvents />} />
                
                <Route path="/Maintenance" element={<Maintenance />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}