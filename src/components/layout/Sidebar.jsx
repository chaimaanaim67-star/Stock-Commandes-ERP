import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  LayoutDashboard,
  Box,
  ShoppingCart,
  Users,
  BarChart3,
  LogOut,
  Package,
  PanelLeftOpen,
  PanelLeftClose,
  ScrollText,
  Moon,
  Sun,
  Globe
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

import logoIsmawood from "../../assets/Logo-ISMAWOOD.png";
import miniLogo from "../../assets/miniLogo.png";

const Sidebar = () => {

  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { i18n } = useTranslation();

  const role =
    localStorage.getItem('role')?.toLowerCase();

  const [isCollapsed, setIsCollapsed] =
    useState(true);

  const sidebarRef = useRef();

  // =====================================================
  // MENUS CONFIG
  // =====================================================

  const menuConfig = {

    admin: [
      {
        name: 'Dashboard IT',
        path: '/admin-dashboard',
        icon: <LayoutDashboard size={20} />
      },
      {
        name: 'Gestion Users',
        path: '/admin-dashboard?tab=users',
        icon: <Users size={20} />
      },
      {
        name: 'Audit Trail',
        path: '/admin-dashboard?tab=audit',
        icon: <ScrollText size={20} />
      },
    ],

    stock: [
      {
        name: 'État de Stock',
        path: '/stock-view',
        icon: <Package size={20} />
      },
      {
        name: 'Mouvements',
        path: '/stock/mouvements',
        icon: <Box size={20} />
      },
    ],

    commercial: [
      {
        name: 'Ventes',
        path: '/commercial',
        icon: <ShoppingCart size={20} />
      },
      {
        name: 'Clients',
        path: '/commercial/clients',
        icon: <Users size={20} />
      },
    ],

    directeur: [
      {
        name: 'Analyses Stats',
        path: '/directeur',
        icon: <BarChart3 size={20} />
      },
      {
        name: 'Rapports PFE',
        path: '/directeur/reports',
        icon: <Package size={20} />
      },
    ]

  };

  const menuRole = role === 'it' ? 'admin' : role;
  const currentMenus = menuConfig[menuRole] || [];

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {

    localStorage.clear();

    navigate('/');

  };

  // =====================================================
  // LANGUAGE TOGGLE
  // =====================================================

  const toggleLanguage = () => {
    const languages = ['fr', 'en', 'ar'];
    const currentLang = i18n.language || localStorage.getItem('language') || 'fr';
    const currentIndex = languages.indexOf(currentLang);
    const nextIndex = (currentIndex + 1) % languages.length;
    const newLang = languages[nextIndex];
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  // =====================================================
  // CLOSE OUTSIDE CLICK
  // =====================================================

  useEffect(() => {

    function handleClickOutside(event) {

      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        !isCollapsed
      ) {

        setIsCollapsed(true);

      }

    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {

      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );

    };

  }, [isCollapsed]);

  // =====================================================
  // UI
  // =====================================================

  return (

    <div
      ref={sidebarRef}
      className={`
        h-screen
        bg-[#4B3621]
        dark:bg-gray-800
        text-white
        flex
        flex-col
        p-4
        shadow-2xl
        transition-all
        duration-300
        ease-in-out
        ${isCollapsed
          ? "w-24 items-center"
          : "w-72"
        }
      `}
    >

      {/* ================================================= */}
      {/* LOGO */}
      {/* ================================================= */}

      <div className="
        w-full
        bg-white/10
        rounded-2xl
        p-3
        flex
        items-center
        justify-center
        shadow-lg
        transition-all
        duration-300
        overflow-hidden
      ">

        {!isCollapsed ? (

          <div className="
            flex
            items-center
            justify-between
            w-full
          ">

            <img
              src={logoIsmawood}
              alt="logo"
              className="
                w-40
                h-12
                object-contain
                rounded-lg
                cursor-pointer
              "
            />

            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="
                p-2
                rounded-xl
                hover:bg-white/10
                transition
              "
            >

              <PanelLeftClose size={24} />

            </button>

          </div>

        ) : (

          <div className="
            flex
            flex-col
            items-center
            gap-3
          ">

            <img
              src={miniLogo}
              alt="mini logo"
              className="
                w-10
                h-10
                object-contain
                rounded-md
                cursor-pointer
              "
            />

            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="
                p-2
                rounded-xl
                hover:bg-white/10
                transition
              "
            >

              <PanelLeftOpen size={22} />

            </button>

          </div>

        )}

      </div>

      {/* ================================================= */}
      {/* MENUS */}
      {/* ================================================= */}

      <nav className="
        flex-1
        w-full
        mt-6
        space-y-2
      ">

        {!isCollapsed && (

          <p className="
            text-[10px]
            font-black
            uppercase
            text-white/30
            tracking-[0.2em]
            mb-4
            ml-2
          ">

            Main Menu

          </p>

        )}

        {currentMenus.map((item, index) => (

          <Link
            key={index}
            to={item.path}
            className={`
              flex
              items-center
              ${isCollapsed
                ? "justify-center"
                : "gap-4"
              }
              p-4
              rounded-2xl
              hover:bg-white/10
              transition-all
              duration-200
              group
            `}
          >

            <span className="
              text-[#9DC183]
              group-hover:text-white
              transition-colors
            ">

              {item.icon}

            </span>

            {!isCollapsed && (

              <span className="
                font-bold
                text-sm
                tracking-tight
                whitespace-nowrap
              ">

                {item.name}

              </span>

            )}

          </Link>

        ))}

      </nav>

      {/* ================================================= */}
      {/* USER + LOGOUT */}
      {/* ================================================= */}

      <div className="
        w-full
        mt-auto
        pt-6
        border-t
        border-white/10
      ">

        {/* USER */}

        <div
          className={`
            flex
            items-center
            ${isCollapsed
              ? "justify-center"
              : "gap-3"
            }
            mb-4
          `}
        >

          <div className="
            w-10
            h-10
            bg-[#9DC183]
            rounded-full
            flex
            items-center
            justify-center
            font-black
            text-[#4B3621]
            shrink-0
          ">

            {localStorage
              .getItem('username')
              ?.charAt(0)
              .toUpperCase()}

          </div>

          {!isCollapsed && (

            <div className="overflow-hidden">

              <p className="
                text-sm
                font-bold
                truncate
                w-32
              ">

                {localStorage.getItem('username')}

              </p>

              <p className="
                text-[10px]
                text-[#9DC183]
                font-black
                uppercase
              ">

                {role}

              </p>

            </div>

          )}

        </div>

        {/* THEME TOGGLE

        <button
          onClick={toggleTheme}
          className={`
            w-full
            flex
            items-center
            ${isCollapsed
              ? "justify-center"
              : "gap-4"
            }
            p-4
            rounded-2xl
            bg-white/5
            hover:bg-white/10
            transition-all
            duration-200
            font-bold
            text-sm
            mb-4
          `}
        >

          {isDark ? <Sun size={20} /> : <Moon size={20} />}

          {!isCollapsed && (
            <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>
          )}

        </button> */}

        {/* LANGUAGE TOGGLE */}

        {/* <button
          onClick={toggleLanguage}
          className={`
            w-full
            flex
            items-center
            ${isCollapsed
              ? "justify-center"
              : "gap-4"
            }
            p-4
            rounded-2xl
            bg-white/5
            hover:bg-white/10
            transition-all
            duration-200
            font-bold
            text-sm
            mb-4
          `}
        >

          <Globe size={20} />

          {!isCollapsed && (
            <span>
              {i18n.language === 'fr' ? 'English' : i18n.language === 'en' ? 'العربية' : 'Français'}
            </span>
          )}

        </button> */}

        {/* LOGOUT */}

        <button
          onClick={handleLogout}
          className={`
            w-full
            flex
            items-center
            ${isCollapsed
              ? "justify-center"
              : "gap-4"
            }
            p-4
            rounded-2xl
            bg-red-500/10
            text-red-400
            hover:bg-red-500
            hover:text-white
            transition-all
            duration-200
            font-bold
            text-sm
          `}
        >

          <LogOut size={20} />

          {!isCollapsed && (
            <span>Déconnexion</span>
          )}

        </button>

      </div>

    </div>

  );

};

export default Sidebar;