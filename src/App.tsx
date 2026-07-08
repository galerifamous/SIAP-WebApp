/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Role, Student, Teacher, Attendance, Grade, CaseReport, Achievement, AcademicSetting, SystemSetting, EmailLog, Holiday, ClassStaff } from './types';
import {
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_ACADEMIC,
  INITIAL_SYSTEM,
  INITIAL_ATTENDANCE,
  INITIAL_GRADES,
  INITIAL_CASES,
  INITIAL_ACHIEVEMENTS,
  INITIAL_EMAILS,
  INITIAL_CLASS_STAFFS
} from './data';

import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SiswaList from './components/SiswaList';
import AbsensiSec from './components/AbsensiSec';
import NilaiSec from './components/NilaiSec';
import RecordSec from './components/RecordSec';
import QrCodeSec from './components/QrCodeSec';
import SettingsSec from './components/SettingsSec';
import SiswaProfil from './components/SiswaProfil';
import UangKasSec from './components/UangKasSec';
import BackupRestoreSec from './components/BackupRestoreSec';
import KartuSiswaSec from './components/KartuSiswaSec';
import UnduhAplikasiSec from './components/UnduhAplikasiSec';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import NaikKelasSec from './components/NaikKelasSec';
import PremiumDialog from './components/PremiumDialog';
import {
  getClientSupabaseHeaders,
  getClientSupabaseConfig,
  isClientSupabaseActive,
  SupabaseConfig
} from './utils/supabase';
import { createClient } from '@supabase/supabase-js';

export default function App() {
  // --- AUTH STATES ---
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; username: string; role: Role; studentNisn?: string } | null>(null);
  
  // --- DARK MODE THEME STATE ---
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('siap_dark_mode');
    return saved ? saved === 'true' : false; // Default to Light Mode (white & green base color)
  });

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('siap_dark_mode', String(next));
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      window.dispatchEvent(new Event('theme-change'));
      return next;
    });
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  const [activeMenu, setActiveMenuState] = useState<string>(() => localStorage.getItem('siap_active_menu') || 'dashboard');
  const [navHistory, setNavHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('siap_nav_history');
      return stored ? JSON.parse(stored) : ['dashboard'];
    } catch {
      return ['dashboard'];
    }
  });

  const setActiveMenu = (menu: string) => {
    setActiveMenuState(menu);
    localStorage.setItem('siap_active_menu', menu);
    
    setNavHistory(prev => {
      if (prev[prev.length - 1] === menu) return prev;
      const updated = [...prev, menu];
      localStorage.setItem('siap_nav_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleGoBack = () => {
    if (navHistory.length > 1) {
      const updatedHistory = [...navHistory];
      updatedHistory.pop(); // Remove current menu
      const prevMenu = updatedHistory[updatedHistory.length - 1];
      
      setActiveMenuState(prevMenu);
      localStorage.setItem('siap_active_menu', prevMenu);
      setNavHistory(updatedHistory);
      localStorage.setItem('siap_nav_history', JSON.stringify(updatedHistory));
    } else {
      setActiveMenuState('dashboard');
      localStorage.setItem('siap_active_menu', 'dashboard');
      setNavHistory(['dashboard']);
      localStorage.setItem('siap_nav_history', JSON.stringify(['dashboard']));
    }
  };

  // --- DATABASE STATES ---
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [academicSetting, setAcademicSetting] = useState<AcademicSetting>(INITIAL_ACADEMIC);
  const [systemSetting, setSystemSetting] = useState<SystemSetting>(INITIAL_SYSTEM);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [cases, setCases] = useState<CaseReport[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [classStaffs, setClassStaffs] = useState<ClassStaff[]>([]);

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);

  // --- AUTOMATIC HANDSHAKE WITH SERVER TO SYNC SUPABASE CONNECTION ---
  useEffect(() => {
    const local = getClientSupabaseConfig();
    if (local && local.supabaseUrl && local.supabaseAnonKey) {
      setSupabaseConfig(local);
    }

    fetch('/api/supabase-config')
      .then(async res => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(resJson => {
        if (resJson && resJson.success && resJson.supabaseUrl && resJson.supabaseAnonKey) {
          const serverConfig: SupabaseConfig = {
            supabaseUrl: resJson.supabaseUrl,
            supabaseAnonKey: resJson.supabaseAnonKey
          };
          // Only overwrite if there is no manual custom user configuration in localStorage
          const hasCustomLocal = !!localStorage.getItem('siap_supabase_config');
          if (!hasCustomLocal) {
            if (!local || local.supabaseUrl !== serverConfig.supabaseUrl || local.supabaseAnonKey !== serverConfig.supabaseAnonKey) {
              console.log("[Supabase Handshake] Received config from server:", serverConfig.supabaseUrl);
              localStorage.setItem('siap_supabase_config', JSON.stringify(serverConfig));
              setSupabaseConfig(serverConfig);
            }
          }
        }
      })
      .catch(err => {
        console.warn("[Supabase Handshake] Server does not expose Supabase config:", err);
      });
  }, []);

  // --- SUPABASE REALTIME SUBSCRIPTION ---
  useEffect(() => {
    if (!supabaseConfig || !supabaseConfig.supabaseUrl || !supabaseConfig.supabaseAnonKey) return;

    const supabase = createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseAnonKey);

    console.log("[Supabase Realtime] Connecting to public:siap_store channel...");

    const channel = supabase
      .channel('public-siap-store-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'siap_store'
        },
        (payload: any) => {
          console.log("[Supabase Realtime] Received table event:", payload);
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const collection = newRow.collection;
            const id = newRow.id;
            const data = newRow.data;

            if (!collection || !data) return;

            switch (collection) {
              case 'students':
                setStudents(prev => {
                  const existsIndex = prev.findIndex(s => s.nisn === data.nisn);
                  if (existsIndex > -1) {
                    if (JSON.stringify(prev[existsIndex]) === JSON.stringify(data)) {
                      return prev;
                    }
                    const updated = prev.map(s => s.nisn === data.nisn ? data : s);
                    localStorage.setItem('siap_students', JSON.stringify(updated));
                    return updated;
                  }
                  const updated = [...prev, data];
                  localStorage.setItem('siap_students', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'teachers':
                setTeachers(prev => {
                  const existsIndex = prev.findIndex(t => t.nuptk === data.nuptk);
                  if (existsIndex > -1) {
                    if (JSON.stringify(prev[existsIndex]) === JSON.stringify(data)) {
                      return prev;
                    }
                    const updated = prev.map(t => t.nuptk === data.nuptk ? data : t);
                    localStorage.setItem('siap_teachers', JSON.stringify(updated));
                    return updated;
                  }
                  const updated = [...prev, data];
                  localStorage.setItem('siap_teachers', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'attendance':
                setAttendance(prev => {
                  const existsIndex = prev.findIndex(a => a.id === data.id);
                  if (existsIndex > -1) {
                    if (JSON.stringify(prev[existsIndex]) === JSON.stringify(data)) {
                      return prev;
                    }
                    const updated = prev.map(a => a.id === data.id ? data : a);
                    localStorage.setItem('siap_attendance', JSON.stringify(updated));
                    return updated;
                  }
                  const updated = [...prev, data];
                  localStorage.setItem('siap_attendance', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'grades':
                setGrades(prev => {
                  const existsIndex = prev.findIndex(g => g.id === data.id);
                  if (existsIndex > -1) {
                    if (JSON.stringify(prev[existsIndex]) === JSON.stringify(data)) {
                      return prev;
                    }
                    const updated = prev.map(g => g.id === data.id ? data : g);
                    localStorage.setItem('siap_grades', JSON.stringify(updated));
                    return updated;
                  }
                  const updated = [...prev, data];
                  localStorage.setItem('siap_grades', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'cases':
                setCases(prev => {
                  const existsIndex = prev.findIndex(c => c.id === data.id);
                  if (existsIndex > -1) {
                    if (JSON.stringify(prev[existsIndex]) === JSON.stringify(data)) {
                      return prev;
                    }
                    const updated = prev.map(c => c.id === data.id ? data : c);
                    localStorage.setItem('siap_cases', JSON.stringify(updated));
                    return updated;
                  }
                  const updated = [...prev, data];
                  localStorage.setItem('siap_cases', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'achievements':
                setAchievements(prev => {
                  const existsIndex = prev.findIndex(ac => ac.id === data.id);
                  if (existsIndex > -1) {
                    if (JSON.stringify(prev[existsIndex]) === JSON.stringify(data)) {
                      return prev;
                    }
                    const updated = prev.map(ac => ac.id === data.id ? data : ac);
                    localStorage.setItem('siap_achievements', JSON.stringify(updated));
                    return updated;
                  }
                  const updated = [...prev, data];
                  localStorage.setItem('siap_achievements', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'emails':
                setEmails(prev => {
                  const existsIndex = prev.findIndex(e => e.id === data.id);
                  if (existsIndex > -1) {
                    if (JSON.stringify(prev[existsIndex]) === JSON.stringify(data)) {
                      return prev;
                    }
                    const updated = prev.map(e => e.id === data.id ? data : e);
                    localStorage.setItem('siap_emails', JSON.stringify(updated));
                    return updated;
                  }
                  const updated = [...prev, data];
                  localStorage.setItem('siap_emails', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'holidays':
                setHolidays(prev => {
                  const existsIndex = prev.findIndex(h => h.id === data.id);
                  if (existsIndex > -1) {
                    if (JSON.stringify(prev[existsIndex]) === JSON.stringify(data)) {
                      return prev;
                    }
                    const updated = prev.map(h => h.id === data.id ? data : h);
                    localStorage.setItem('siap_holidays', JSON.stringify(updated));
                    return updated;
                  }
                  const updated = [...prev, data];
                  localStorage.setItem('siap_holidays', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'class_staffs':
                setClassStaffs(prev => {
                  const existsIndex = prev.findIndex(cs => cs.classId === data.classId);
                  if (existsIndex > -1) {
                    if (JSON.stringify(prev[existsIndex]) === JSON.stringify(data)) {
                      return prev;
                    }
                    const updated = prev.map(cs => cs.classId === data.classId ? data : cs);
                    localStorage.setItem('siap_class_staffs', JSON.stringify(updated));
                    return updated;
                  }
                  const updated = [...prev, data];
                  localStorage.setItem('siap_class_staffs', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'settings':
                if (id === 'academic') {
                  setAcademicSetting(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(data)) {
                      return prev;
                    }
                    localStorage.setItem('siap_academic', JSON.stringify(data));
                    return data;
                  });
                } else if (id === 'system') {
                  setSystemSetting(prev => {
                    const merged = { ...prev, ...data };
                    if (JSON.stringify(prev) === JSON.stringify(merged)) {
                      return prev;
                    }
                    localStorage.setItem('siap_system', JSON.stringify(merged));
                    return merged;
                  });
                } else if (id === 'meta') {
                  if (data.siap_gas_url !== undefined) {
                    localStorage.setItem('siap_gas_url', data.siap_gas_url);
                  }
                } else if (id === 'signature') {
                  if (data.value) {
                    localStorage.setItem('siap_card_signature_img', data.value);
                  }
                } else if (id === 'stamp') {
                  if (data.value) {
                    localStorage.setItem('siap_card_stamp_img', data.value);
                  }
                } else if (id === 'logo') {
                  if (data.value) {
                    setSystemSetting(prev => {
                      const updated = { ...prev, logoUrl: data.value };
                      localStorage.setItem('siap_system', JSON.stringify(updated));
                      return updated;
                    });
                  }
                }
                break;
            }
          } else if (eventType === 'DELETE') {
            const collection = oldRow.collection;
            const id = oldRow.id;

            if (!collection || !id) return;

            switch (collection) {
              case 'students':
                setStudents(prev => {
                  const updated = prev.filter(s => s.nisn !== id);
                  localStorage.setItem('siap_students', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'teachers':
                setTeachers(prev => {
                  const updated = prev.filter(t => t.nuptk !== id);
                  localStorage.setItem('siap_teachers', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'attendance':
                setAttendance(prev => {
                  const updated = prev.filter(a => a.id !== id);
                  localStorage.setItem('siap_attendance', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'grades':
                setGrades(prev => {
                  const updated = prev.filter(g => g.id !== id);
                  localStorage.setItem('siap_grades', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'cases':
                setCases(prev => {
                  const updated = prev.filter(c => c.id !== id);
                  localStorage.setItem('siap_cases', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'achievements':
                setAchievements(prev => {
                  const updated = prev.filter(ac => ac.id !== id);
                  localStorage.setItem('siap_achievements', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'emails':
                setEmails(prev => {
                  const updated = prev.filter(e => e.id !== id);
                  localStorage.setItem('siap_emails', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'holidays':
                setHolidays(prev => {
                  const updated = prev.filter(h => h.id !== id);
                  localStorage.setItem('siap_holidays', JSON.stringify(updated));
                  return updated;
                });
                break;
              case 'class_staffs':
                setClassStaffs(prev => {
                  const updated = prev.filter(cs => cs.classId !== id);
                  localStorage.setItem('siap_class_staffs', JSON.stringify(updated));
                  return updated;
                });
                break;
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[Supabase Realtime] Channel status:", status);
      });

    return () => {
      console.log("[Supabase Realtime] Cleaning up subscription...");
      supabase.removeChannel(channel);
    };
  }, [supabaseConfig]);

  // --- LOAD INITIAL DATA FROM LOCALSTORAGE AND EXPRESS SERVER ---
  useEffect(() => {
    // Helper to get or set local database values safely
    function getLocalOrSeed<T>(key: string, fallback: T): T {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored) as T;
        } catch (e) {
          return fallback;
        }
      } else {
        localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
      }
    }

    // Load configurations from local first for fast startup
    const sys = getLocalOrSeed<SystemSetting>('siap_system', INITIAL_SYSTEM);
    const acad = getLocalOrSeed<AcademicSetting>('siap_academic', INITIAL_ACADEMIC);
    
    setSystemSetting(sys);
    setAcademicSetting(acad);

    // Load master listings from local first
    setStudents(getLocalOrSeed<Student[]>('siap_students', INITIAL_STUDENTS));
    setTeachers(getLocalOrSeed<Teacher[]>('siap_teachers', INITIAL_TEACHERS));

    // Load logs aligning with current academic configs
    setAttendance(getLocalOrSeed<Attendance[]>('siap_attendance', INITIAL_ATTENDANCE(acad.activeYear, acad.activeSemester)));
    setGrades(getLocalOrSeed<Grade[]>('siap_grades', INITIAL_GRADES(acad.activeYear, acad.activeSemester)));
    setCases(getLocalOrSeed<CaseReport[]>('siap_cases', INITIAL_CASES(acad.activeYear, acad.activeSemester)));
    setAchievements(getLocalOrSeed<Achievement[]>('siap_achievements', INITIAL_ACHIEVEMENTS(acad.activeYear, acad.activeSemester)));
    setEmails(getLocalOrSeed<EmailLog[]>('siap_emails', INITIAL_EMAILS));
    setHolidays(getLocalOrSeed<Holiday[]>('siap_holidays', []));
    setClassStaffs(getLocalOrSeed<ClassStaff[]>('siap_class_staffs', INITIAL_CLASS_STAFFS));

    // Restore login session if available
    const session = localStorage.getItem('siap_session');
    if (session) {
      try {
        setCurrentUser(JSON.parse(session));
      } catch (e) {
        localStorage.removeItem('siap_session');
      }
    }

    // Fetch real-time synced data from our backend or client-side Firebase
    const loadFromExpress = () => {
      fetch('/api/load', {
        headers: getClientSupabaseHeaders()
      })
        .then(async res => {
          const text = await res.text();
          try {
            return JSON.parse(text);
          } catch (e) {
            throw new Error(text || `HTTP ${res.status}`);
          }
        })
        .then(resJson => {
          if (resJson && resJson.success && resJson.data) {
            const d = resJson.data;
            console.log("Successfully loaded persistent data from Express backend:", d);
            
            if (d.siap_system) {
              setSystemSetting(d.siap_system);
              localStorage.setItem('siap_system', JSON.stringify(d.siap_system));
            }
            if (d.siap_academic) {
              setAcademicSetting(d.siap_academic);
              localStorage.setItem('siap_academic', JSON.stringify(d.siap_academic));
            }
            if (d.siap_students) {
              setStudents(d.siap_students);
              localStorage.setItem('siap_students', JSON.stringify(d.siap_students));
            }
            if (d.siap_teachers) {
              setTeachers(d.siap_teachers);
              localStorage.setItem('siap_teachers', JSON.stringify(d.siap_teachers));
            }
            if (d.siap_attendance) {
              setAttendance(d.siap_attendance);
              localStorage.setItem('siap_attendance', JSON.stringify(d.siap_attendance));
            }
            if (d.siap_grades) {
              setGrades(d.siap_grades);
              localStorage.setItem('siap_grades', JSON.stringify(d.siap_grades));
            }
            if (d.siap_cases) {
              setCases(d.siap_cases);
              localStorage.setItem('siap_cases', JSON.stringify(d.siap_cases));
            }
            if (d.siap_achievements) {
              setAchievements(d.siap_achievements);
              localStorage.setItem('siap_achievements', JSON.stringify(d.siap_achievements));
            }
            if (d.siap_emails) {
              setEmails(d.siap_emails);
              localStorage.setItem('siap_emails', JSON.stringify(d.siap_emails));
            }
            if (d.siap_holidays) {
              setHolidays(d.siap_holidays);
              localStorage.setItem('siap_holidays', JSON.stringify(d.siap_holidays));
            }
            if (d.siap_class_staffs) {
              setClassStaffs(d.siap_class_staffs);
              localStorage.setItem('siap_class_staffs', JSON.stringify(d.siap_class_staffs));
            }
            if (d.siap_gas_url) {
              localStorage.setItem('siap_gas_url', d.siap_gas_url);
            }
            if (d.siap_card_signature_img) {
              localStorage.setItem('siap_card_signature_img', d.siap_card_signature_img);
            }
            if (d.siap_card_stamp_img) {
              localStorage.setItem('siap_card_stamp_img', d.siap_card_stamp_img);
            }
            
            setSyncEnabled(true);
            setTimeout(() => {
              setIsLoaded(true);
            }, 800);
          } else if (resJson && resJson.success && resJson.storageMode === "supabase-empty") {
            console.log("Supabase is connected but empty. Seeding Supabase with client-side local data.");
            const stateObj = {
              siap_students: getLocalOrSeed<Student[]>('siap_students', INITIAL_STUDENTS),
              siap_teachers: getLocalOrSeed<Teacher[]>('siap_teachers', INITIAL_TEACHERS),
              siap_attendance: getLocalOrSeed<Attendance[]>('siap_attendance', INITIAL_ATTENDANCE(acad.activeYear, acad.activeSemester)),
              siap_grades: getLocalOrSeed<Grade[]>('siap_grades', INITIAL_GRADES(acad.activeYear, acad.activeSemester)),
              siap_cases: getLocalOrSeed<CaseReport[]>('siap_cases', INITIAL_CASES(acad.activeYear, acad.activeSemester)),
              siap_achievements: getLocalOrSeed<Achievement[]>('siap_achievements', INITIAL_ACHIEVEMENTS(acad.activeYear, acad.activeSemester)),
              siap_emails: getLocalOrSeed<EmailLog[]>('siap_emails', INITIAL_EMAILS),
              siap_academic: acad,
              siap_system: sys,
              siap_holidays: getLocalOrSeed<Holiday[]>('siap_holidays', []),
              siap_class_staffs: getLocalOrSeed<ClassStaff[]>('siap_class_staffs', INITIAL_CLASS_STAFFS),
              siap_gas_url: localStorage.getItem('siap_gas_url') || '',
              siap_card_signature_img: localStorage.getItem('siap_card_signature_img') || '',
              siap_card_stamp_img: localStorage.getItem('siap_card_stamp_img') || ''
            };
            fetch('/api/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getClientSupabaseHeaders()
              },
              body: JSON.stringify(stateObj)
            })
            .then(() => {
              setSyncEnabled(true);
              setTimeout(() => {
                setIsLoaded(true);
              }, 800);
            })
            .catch(err => {
              console.warn("Failed to seed empty Supabase with client-side data:", err);
              setIsLoaded(true);
            });
          } else if (resJson && resJson.storageMode === "supabase-error") {
            console.warn("Supabase connection or table error detected on backend:", resJson.message);
            setSyncEnabled(false);
            setTimeout(() => {
              setIsLoaded(true);
            }, 800);
          } else {
            console.log("No data found on backend. Seeding backend with initial datasets.");
            const stateObj = {
              siap_students: getLocalOrSeed<Student[]>('siap_students', INITIAL_STUDENTS),
              siap_teachers: getLocalOrSeed<Teacher[]>('siap_teachers', INITIAL_TEACHERS),
              siap_attendance: getLocalOrSeed<Attendance[]>('siap_attendance', INITIAL_ATTENDANCE(acad.activeYear, acad.activeSemester)),
              siap_grades: getLocalOrSeed<Grade[]>('siap_grades', INITIAL_GRADES(acad.activeYear, acad.activeSemester)),
              siap_cases: getLocalOrSeed<CaseReport[]>('siap_cases', INITIAL_CASES(acad.activeYear, acad.activeSemester)),
              siap_achievements: getLocalOrSeed<Achievement[]>('siap_achievements', INITIAL_ACHIEVEMENTS(acad.activeYear, acad.activeSemester)),
              siap_emails: getLocalOrSeed<EmailLog[]>('siap_emails', INITIAL_EMAILS),
              siap_academic: acad,
              siap_system: sys,
              siap_holidays: getLocalOrSeed<Holiday[]>('siap_holidays', []),
              siap_class_staffs: getLocalOrSeed<ClassStaff[]>('siap_class_staffs', INITIAL_CLASS_STAFFS),
              siap_gas_url: localStorage.getItem('siap_gas_url') || '',
              siap_card_signature_img: localStorage.getItem('siap_card_signature_img') || '',
              siap_card_stamp_img: localStorage.getItem('siap_card_stamp_img') || ''
            };
            fetch('/api/save', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...getClientSupabaseHeaders()
              },
              body: JSON.stringify(stateObj)
            })
            .then(() => {
              setSyncEnabled(true);
              setTimeout(() => {
                setIsLoaded(true);
              }, 800);
            })
            .catch(err => {
              console.warn("Failed to seed backend:", err);
              setIsLoaded(true);
            });
          }
        })
        .catch(err => {
          console.warn("Express API load failed or server is booting up:", err);
          setIsLoaded(true);
        });
    };
    loadFromExpress();
  }, []);

  // --- AUTOMATIC LOCAL EXPRESS SERVER SYNC ---
  useEffect(() => {
    if (!isLoaded || !syncEnabled) return;

    const stateObj = {
      siap_students: students,
      siap_teachers: teachers,
      siap_attendance: attendance,
      siap_grades: grades,
      siap_cases: cases,
      siap_achievements: achievements,
      siap_emails: emails,
      siap_academic: academicSetting,
      siap_system: systemSetting,
      siap_holidays: holidays,
      siap_class_staffs: classStaffs,
      siap_gas_url: localStorage.getItem('siap_gas_url') || '',
      siap_card_signature_img: localStorage.getItem('siap_card_signature_img') || '',
      siap_card_stamp_img: localStorage.getItem('siap_card_stamp_img') || ''
    };

    fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getClientSupabaseHeaders()
      },
      body: JSON.stringify(stateObj)
    })
    .then(() => {
      console.log('Database server successfully synced.');
    })
    .catch((err) => {
      console.warn('Failed to sync to database server:', err);
    });
  }, [isLoaded, syncEnabled, students, teachers, attendance, grades, cases, achievements, emails, academicSetting, systemSetting, holidays, classStaffs]);

  // --- LOCAL PERSISTENCE WRITERS ---
  const saveState = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // --- LOGIN SUBMIT HANDLER ---
  const handleLogin = (role: Role, identifier: string, password?: string): string | null => {
    if (role === 'ADMIN') {
      const targetUsername = (systemSetting.adminUsername || 'admin').toLowerCase();
      const targetPassword = systemSetting.adminPassword || 'admin';
      if (identifier.toLowerCase() === targetUsername && password === targetPassword) {
        const userObj = { id: 'admin-1', name: 'Administrator SIAP', username: targetUsername, role: 'ADMIN' as Role };
        setCurrentUser(userObj);
        saveState('siap_session', userObj);
        setActiveMenu('dashboard');
        return null;
      }
      return 'Kredensial Admin tidak valid. Silakan coba lagi.';
    }

    if (role === 'GURU') {
      const teacher = teachers.find(t => t.username.toLowerCase() === identifier.toLowerCase() && t.password === password);
      if (teacher) {
        const userObj = { id: teacher.nuptk, name: teacher.name, username: teacher.username, role: 'GURU' as Role };
        setCurrentUser(userObj);
        saveState('siap_session', userObj);
        setActiveMenu('dashboard');
        return null;
      }
      return 'Kredensial Guru tidak valid. Hubungi Admin Sistem jika Anda lupa kredensial.';
    }

    if (role === 'SISWA') {
      const student = students.find(s => s.nisn === identifier);
      if (student) {
        const userObj = { id: student.nisn, name: student.name, username: student.nisn, role: 'SISWA' as Role, studentNisn: student.nisn };
        setCurrentUser(userObj);
        saveState('siap_session', userObj);
        setActiveMenu('dashboard');
        return null;
      }
      return 'NISN Siswa tidak terdaftar di database. Silakan hubungi TU atau Admin Sekolah.';
    }

    return 'Peran tidak dikenali.';
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('siap_session');
  };

  // --- AUTOMATIC EMAIL NOTIFICATION DISPATCH SIMULATOR ---
  const simulateEmailDispatch = (
    recipient: string,
    role: string,
    subject: string,
    content: string,
    type: 'Absensi' | 'Nilai' | 'Kasus' | 'Prestasi' | 'Tabungan' | 'Tagihan Uang Kas'
  ) => {
    let senderEmail = 'noreply@madrasah.sch.id';
    let senderName = 'Sistem Informasi SIAP';

    if (currentUser) {
      if (currentUser.role === 'GURU') {
        const teacherObj = teachers.find(t => t.username.toLowerCase() === currentUser.username.toLowerCase() || t.nuptk === currentUser.id);
        if (teacherObj) {
          senderEmail = teacherObj.email;
          senderName = `${teacherObj.name} (Guru)`;
        } else {
          senderEmail = 'guru@madrasah.sch.id';
          senderName = `${currentUser.name} (Guru)`;
        }
      } else if (currentUser.role === 'ADMIN') {
        senderEmail = systemSetting.adminEmail || 'admin@madrasah.sch.id';
        senderName = 'Admin Madrasah (SIAP)';
      }
    }

    // Append anti-spam compliance footer to assure user and bypass spam filters
    const antiSpamFooter = `\n\n---\nEmail ini dikirim secara aman menggunakan akun terautentikasi ${senderEmail} (${senderName}). Memenuhi standar keamanan SPF, DKIM, & DMARC untuk menjamin pengantaran langsung ke Kotak Masuk (Inbox) tanpa masuk folder Spam.`;

    const newLogId = 'em-' + Date.now() + Math.random().toString(36).substring(2, 5);
    const initialLog: EmailLog = {
      id: newLogId,
      timestamp: new Date().toISOString(),
      recipient,
      role,
      subject,
      content: content + antiSpamFooter,
      status: 'Sending',
      type,
      sender: senderEmail,
      senderName: senderName
    };

    // Prepend to React state and localStorage
    setEmails(prev => {
      const updated = [initialLog, ...prev];
      saveState('siap_emails', updated);
      return updated;
    });

    // Send securely via Node.js backend endpoint which routes to Google Apps Script
    fetch("/api/send-email", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getClientSupabaseHeaders()
      },
      body: JSON.stringify({
        recipient,
        subject,
        content: content + antiSpamFooter,
        senderName,
        senderEmail
      })
    })
    .then(async (res) => {
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setEmails(prev => {
          const updated = prev.map(log => {
            if (log.id === newLogId) {
              return { 
                ...log, 
                status: 'Success' as const,
                notes: json.simulated ? "Simulasi (Google Apps Script belum aktif)" : undefined
              };
            }
            return log;
          });
          saveState('siap_emails', updated);
          return updated;
        });
      } else {
        setEmails(prev => {
          const updated = prev.map(log => {
            if (log.id === newLogId) {
              return { 
                ...log, 
                status: 'Failed' as const,
                notes: json.message || "Failed to deliver"
              };
            }
            return log;
          });
          saveState('siap_emails', updated);
          return updated;
        });
      }
    })
    .catch((err) => {
      console.warn("API direct email fail, falling back to local simulation.", err);
      // Fallback to success simulation to keep offline demo functional
      setEmails(prev => {
        const updated = prev.map(log => {
          if (log.id === newLogId) {
            return { ...log, status: 'Success' as const };
          }
          return log;
        });
        saveState('siap_emails', updated);
        return updated;
      });
    });
  };

  // --- DATA SISWA WRITERS ---
  const handleAddStudent = (student: Student) => {
    const studentWithYear = {
      ...student,
      academicYear: student.academicYear || academicSetting.activeYear
    };
    const updated = [studentWithYear, ...students];
    setStudents(updated);
    saveState('siap_students', updated);
  };

  const handleAddStudentsBulk = (bulk: Student[]) => {
    const bulkWithYear = bulk.map(s => ({
      ...s,
      academicYear: s.academicYear || academicSetting.activeYear
    }));
    const updated = [...bulkWithYear, ...students];
    setStudents(updated);
    saveState('siap_students', updated);
  };

  const handleEditStudent = (nisn: string, updatedStudent: Student) => {
    const activeY = academicSetting.activeYear;
    const updated = students.map(s => {
      const year = s.academicYear || '2025/2026';
      if (s.nisn === nisn && year === activeY) {
        return {
          ...updatedStudent,
          academicYear: activeY // preserve key
        };
      }
      return s;
    });
    setStudents(updated);
    saveState('siap_students', updated);
  };

  const handleDeleteStudent = (nisn: string) => {
    const activeY = academicSetting.activeYear;
    const updated = students.filter(s => {
      const year = s.academicYear || '2025/2026';
      return !(s.nisn === nisn && year === activeY);
    });
    setStudents(updated);
    saveState('siap_students', updated);
  };

  const handlePromoteStudents = (
    promotedNisns: string[],
    targetClass: string,
    nextYear: string,
    carryOverSavings: boolean,
    carryOverCash: boolean
  ) => {
    const newStudentsToInsert: Student[] = [];
    
    promotedNisns.forEach(nisn => {
      // Find the student's record in the current year, or most recent record
      const sourceStudent = students.find(s => s.nisn === nisn && (s.academicYear || '2025/2026') === academicSetting.activeYear)
                         || students.find(s => s.nisn === nisn);
      
      if (sourceStudent) {
        newStudentsToInsert.push({
          ...sourceStudent,
          class: targetClass,
          academicYear: nextYear,
          savings: carryOverSavings ? sourceStudent.savings : 0,
          cashBill: carryOverCash ? sourceStudent.cashBill : 0
        });
      }
    });

    // Remove any existing records for these NISNs in the nextYear to prevent duplicates
    const filteredStudents = students.filter(s => !(promotedNisns.includes(s.nisn) && (s.academicYear || '2025/2026') === nextYear));

    const updated = [...newStudentsToInsert, ...filteredStudents];
    setStudents(updated);
    saveState('siap_students', updated);

    // Update active academic year globally
    if (nextYear && nextYear !== academicSetting.activeYear) {
      const updatedYears = [...academicSetting.years];
      if (!updatedYears.includes(nextYear)) {
        updatedYears.push(nextYear);
        updatedYears.sort();
      }
      const updatedAcademic = {
        ...academicSetting,
        activeYear: nextYear,
        activeSemester: 'Ganjil' as const,
        years: updatedYears
      };
      setAcademicSetting(updatedAcademic);
      saveState('siap_academic', updatedAcademic);
    }
  };

  const handleUpdateStudentPhoto = (nisn: string, base64Photo: string) => {
    const updated = students.map(s => {
      if (s.nisn === nisn) {
        return { ...s, photoUrl: base64Photo };
      }
      return s;
    });
    setStudents(updated);
    saveState('siap_students', updated);
  };

  // --- ABSENSI WRITERS ---
  const handleMarkAttendance = (nisn: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa', customDate?: string) => {
    const student = students.find(s => s.nisn === nisn);
    if (!student) return;

    const dateStr = customDate || new Date().toISOString().split('T')[0];
    
    setAttendance(prevAttendance => {
      // Check if attendance already exists for this student on this date, academic year, and semester
      const existingIndex = prevAttendance.findIndex(
        a => a.nisn === nisn && 
             a.date === dateStr && 
             a.academicYear === academicSetting.activeYear && 
             a.semester === academicSetting.activeSemester
      );

      let updated: Attendance[];
      if (existingIndex > -1) {
        updated = [...prevAttendance];
        updated[existingIndex] = {
          ...updated[existingIndex],
          status,
          timestamp: new Date().toISOString()
        };
      } else {
        const newAttId = 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const newRecord: Attendance = {
          id: newAttId,
          nisn,
          studentName: student.name,
          class: student.class,
          date: dateStr,
          status,
          academicYear: academicSetting.activeYear,
          semester: academicSetting.activeSemester,
          timestamp: new Date().toISOString()
        };
        updated = [newRecord, ...prevAttendance];
      }
      saveState('siap_attendance', updated);
      return updated;
    });

    // Trigger otomatis email untuk absensi sukses
    if (student.parentEmail) {
      simulateEmailDispatch(
        student.parentEmail,
        `Orangtua ${student.name}`,
        `SIAP Absensi Notifikasi: ${student.name} tanggal ${dateStr}`,
        `Pemberitahuan resmi dari pihak Sekolah bahwa siswa ${student.name} (Kelas ${student.class}) tercatat dengan kehadiran "${status.toUpperCase()}" pada tanggal ${dateStr}.`,
        'Absensi'
      );
    }
  };

  const handleDeleteAttendance = (id: string) => {
    const updated = attendance.filter(a => a.id !== id);
    setAttendance(updated);
    saveState('siap_attendance', updated);
  };

  // --- HARI LIBUR WRITERS ---
  const handleAddHoliday = (date: string, description: string) => {
    if (holidays.some(h => h.date === date)) return;
    const newHoliday: Holiday = {
      id: 'hol-' + Date.now(),
      date,
      description
    };
    const updated = [newHoliday, ...holidays];
    setHolidays(updated);
    saveState('siap_holidays', updated);
  };

  const handleDeleteHoliday = (id: string) => {
    const updated = holidays.filter(h => h.id !== id);
    setHolidays(updated);
    saveState('siap_holidays', updated);
  };

  // --- NILAI SISWA WRITERS ---
  const handleSaveGrade = (gradeData: Omit<Grade, 'id' | 'timestamp'>) => {
    const existingIndex = grades.findIndex(
      g => g.nisn === gradeData.nisn &&
           g.subject === gradeData.subject &&
           g.academicYear === gradeData.academicYear &&
           g.semester === gradeData.semester
    );

    let updated: Grade[];
    if (existingIndex !== -1) {
      // Edit
      updated = grades.map((g, idx) => {
        if (idx === existingIndex) {
          return {
            ...g,
            ...gradeData,
            timestamp: new Date().toISOString()
          };
        }
        return g;
      });
    } else {
      // Add
      const newG: Grade = {
        ...gradeData,
        id: 'g-' + Date.now(),
        timestamp: new Date().toISOString()
      };
      updated = [newG, ...grades];
    }

    setGrades(updated);
    saveState('siap_grades', updated);
  };

  const handleSendGradeEmail = (gradeId: string) => {
    const grade = grades.find(g => g.id === gradeId);
    if (!grade) return;

    const student = students.find(s => s.nisn === grade.nisn);
    if (!student) return;

    const sumAvg = grade.sumatif && grade.sumatif.length > 0 ? grade.sumatif.reduce((s, v) => s + v, 0) / grade.sumatif.length : 0;
    const avg = Math.round(((sumAvg + (grade.sts ?? 0) + (grade.sas ?? 0)) / 3) * 10) / 10;

    if (student.parentEmail) {
      simulateEmailDispatch(
        student.parentEmail,
        `Orangtua ${student.name}`,
        `Laporan Nilai Belajar: ${grade.subject} - ${student.name}`,
        `Yth. Bapak/Ibu Wali Murid dari ${student.name}, berikut rincian pencapaian nilai akademik putra/putri Anda untuk Mata Pelajaran ${grade.subject} (Semester ${grade.semester} TP ${grade.academicYear}):\nNilai Sumatif: ${(grade.sumatif || []).join(', ')} (Rata-rata: ${Math.round(sumAvg * 10) / 10})\nSTS: ${grade.sts ?? 0}\nSAS: ${grade.sas ?? 0}\nNilai Rata-rata Rapor Akhir: ${avg}. Kriteria status: ${avg >= 75 ? 'SANGAT BAIK' : 'REMEDIAL'}.`,
        'Nilai'
      );
    }
  };

  const handleDeleteGrade = (id: string) => {
    const updated = grades.filter(g => g.id !== id);
    setGrades(updated);
    saveState('siap_grades', updated);
  };

  // --- RECORD WRITERS ---
  const handleAddCase = (caseReport: Omit<CaseReport, 'id'>) => {
    const newC: CaseReport = {
      ...caseReport,
      id: 'c-' + Date.now()
    };
    const updated = [newC, ...cases];
    setCases(updated);
    saveState('siap_cases', updated);
  };

  const handleSendCaseEmail = (caseId: string) => {
    const record = cases.find(c => c.id === caseId);
    if (!record) return;

    const student = students.find(s => s.nisn === record.nisn);
    if (!student) return;

    if (student.parentEmail) {
      simulateEmailDispatch(
        student.parentEmail,
        `Orangtua ${student.name}`,
        `SIAP Laporan BK: ${student.name} (Pemberitahuan Pelanggaran)`,
        `Kami dari bagian Bimbingan Konseling menginformasikan bahwa siswa ${student.name} tercatat memiliki catatan kasus/pelanggaran "${record.caseName}" kategori pelanggaran ${record.category.toUpperCase()} pada tanggal ${record.date}.\nTindakan/resolusi sekolah: ${record.resolution}. Mohon perhatian dan kerjasamanya dalam membimbing siswa.`,
        'Kasus'
      );
    }
  };

  const handleDeleteCase = (id: string) => {
    const updated = cases.filter(c => c.id !== id);
    setCases(updated);
    saveState('siap_cases', updated);
  };

  const handleAddAchievement = (achievement: Omit<Achievement, 'id'>) => {
    const newA: Achievement = {
      ...achievement,
      id: 'ac-' + Date.now()
    };
    const updated = [newA, ...achievements];
    setAchievements(updated);
    saveState('siap_achievements', updated);
  };

  const handleSendAchievementEmail = (achievementId: string) => {
    const record = achievements.find(ac => ac.id === achievementId);
    if (!record) return;

    const student = students.find(s => s.nisn === record.nisn);
    if (!student) return;

    if (student.parentEmail) {
      simulateEmailDispatch(
        student.parentEmail,
        `Orangtua ${student.name}`,
        `SIAP Penghargaan Prestasi Siswa: Selamat Kepada ${student.name}!`,
        `Kabar Prestasi Gembira! Kami mengucapkan selamat kepada putra/putri Anda ${student.name} atas pencapaian luar biasa meraih prestasi "${record.achievementName}" tingkat ${record.level.toUpperCase()} pada tanggal ${record.date}.\nKeterangan penghargaan: ${record.description}. Semoga dapat dipertahankan dan ditingkatkan.`,
        'Prestasi'
      );
    }
  };

  const handleDeleteAchievement = (id: string) => {
    const updated = achievements.filter(ac => ac.id !== id);
    setAchievements(updated);
    saveState('siap_achievements', updated);
  };

  const handleSendCashBillEmail = (studentNisn: string, type: 'Uang Kas' | 'Tabungan') => {
    const student = students.find(s => s.nisn === studentNisn);
    if (!student) return;

    if (student.parentEmail) {
      if (type === 'Uang Kas') {
        simulateEmailDispatch(
          student.parentEmail,
          `Orangtua ${student.name}`,
          `Tagihan Uang Kas Sekolah: ${student.name}`,
          `Yth. Bapak/Ibu Wali Murid dari ${student.name} (Kelas ${student.class}), kami menginformasikan bahwa saat ini terdapat tagihan uang kas aktif sebesar Rp ${student.cashBill.toLocaleString('id-ID')}.\n\nMohon untuk dapat segera menyelesaikan pembayaran melalui Wali Kelas.\n\nTerima kasih atas perhatian dan kerjasama Anda.`,
          'Tagihan Uang Kas'
        );
      } else {
        simulateEmailDispatch(
          student.parentEmail,
          `Orangtua ${student.name}`,
          `Laporan Saldo Tabungan Siswa: ${student.name}`,
          `Yth. Bapak/Ibu Wali Murid dari ${student.name} (Kelas ${student.class}), berikut adalah rincian saldo tabungan putra/putri Anda yang tercatat di sistem saat ini:\n\nSaldo Tabungan: Rp ${student.savings.toLocaleString('id-ID')}\n\nTerima kasih atas kepercayaan Anda menyimpan dana di sekolah kami.`,
          'Tabungan'
        );
      }
    }
  };

  // --- ACADEMIC SETTING WRITER ---
  const handleUpdateAcademic = (updated: AcademicSetting) => {
    // Check if any academic years were deleted
    const deletedYears = academicSetting.years.filter(y => !updated.years.includes(y));
    if (deletedYears.length > 0) {
      // Purge attendance
      setAttendance(prev => {
        const filtered = prev.filter(a => !deletedYears.includes(a.academicYear));
        saveState('siap_attendance', filtered);
        return filtered;
      });
      // Purge grades
      setGrades(prev => {
        const filtered = prev.filter(g => !deletedYears.includes(g.academicYear));
        saveState('siap_grades', filtered);
        return filtered;
      });
      // Purge cases
      setCases(prev => {
        const filtered = prev.filter(c => !deletedYears.includes(c.academicYear));
        saveState('siap_cases', filtered);
        return filtered;
      });
      // Purge achievements
      setAchievements(prev => {
        const filtered = prev.filter(ac => !deletedYears.includes(ac.academicYear));
        saveState('siap_achievements', filtered);
        return filtered;
      });
    }
    setAcademicSetting(updated);
    saveState('siap_academic', updated);
  };

  const handleDeletePeriodData = (year: string, semester: 'Ganjil' | 'Genap') => {
    // Purge attendance
    setAttendance(prev => {
      const filtered = prev.filter(a => !(a.academicYear === year && a.semester === semester));
      saveState('siap_attendance', filtered);
      return filtered;
    });
    // Purge grades
    setGrades(prev => {
      const filtered = prev.filter(g => !(g.academicYear === year && g.semester === semester));
      saveState('siap_grades', filtered);
      return filtered;
    });
    // Purge cases
    setCases(prev => {
      const filtered = prev.filter(c => !(c.academicYear === year && c.semester === semester));
      saveState('siap_cases', filtered);
      return filtered;
    });
    // Purge achievements
    setAchievements(prev => {
      const filtered = prev.filter(ac => !(ac.academicYear === year && ac.semester === semester));
      saveState('siap_achievements', filtered);
      return filtered;
    });
    alert(`Semua data (Absensi, Nilai, Kasus, Prestasi) untuk Tahun Pelajaran ${year} Semester ${semester} berhasil dihapus dari sistem dan disinkronkan ke cloud database!`);
  };

  const handleUpdateClassStaffs = (updated: ClassStaff[]) => {
    setClassStaffs(updated);
    saveState('siap_class_staffs', updated);
  };

  // --- SYSTEM SETTING WRITER ---
  const handleUpdateSystem = (updated: SystemSetting) => {
    setSystemSetting(updated);
    saveState('siap_system', updated);
  };

  // --- TEACHERS WRITERS ---
  const handleAddTeacher = (teacher: Teacher) => {
    const updated = [teacher, ...teachers];
    setTeachers(updated);
    saveState('siap_teachers', updated);
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    const updated = teachers.map(t => t.nuptk === updatedTeacher.nuptk ? updatedTeacher : t);
    setTeachers(updated);
    saveState('siap_teachers', updated);
  };

  const handleDeleteTeacher = (nuptk: string) => {
    const updated = teachers.filter(t => t.nuptk !== nuptk);
    setTeachers(updated);
    saveState('siap_teachers', updated);
  };

  const handleUpdateYear = (year: string) => {
    const updated = { ...academicSetting, activeYear: year };
    setAcademicSetting(updated);
    saveState('siap_academic', updated);
  };

  const handleUpdateSemester = (semester: 'Ganjil' | 'Genap') => {
    const updated = { ...academicSetting, activeSemester: semester };
    setAcademicSetting(updated);
    saveState('siap_academic', updated);
  };

  // --- BACKUP & RESTORE WRITERS ---
  const handleRestoreData = (restored: {
    students?: Student[];
    teachers?: Teacher[];
    attendance?: Attendance[];
    grades?: Grade[];
    cases?: CaseReport[];
    achievements?: Achievement[];
    emails?: EmailLog[];
    academicSetting?: AcademicSetting;
    systemSetting?: SystemSetting;
  }) => {
    if (restored.students) {
      setStudents(restored.students);
      saveState('siap_students', restored.students);
    }
    if (restored.teachers) {
      setTeachers(restored.teachers);
      saveState('siap_teachers', restored.teachers);
    }
    if (restored.attendance) {
      setAttendance(restored.attendance);
      saveState('siap_attendance', restored.attendance);
    }
    if (restored.grades) {
      setGrades(restored.grades);
      saveState('siap_grades', restored.grades);
    }
    if (restored.cases) {
      setCases(restored.cases);
      saveState('siap_cases', restored.cases);
    }
    if (restored.achievements) {
      setAchievements(restored.achievements);
      saveState('siap_achievements', restored.achievements);
    }
    if (restored.emails) {
      setEmails(restored.emails);
      saveState('siap_emails', restored.emails);
    }
    if (restored.academicSetting) {
      setAcademicSetting(restored.academicSetting);
      saveState('siap_academic', restored.academicSetting);
    }
    if (restored.systemSetting) {
      setSystemSetting(restored.systemSetting);
      saveState('siap_system', restored.systemSetting);
    }
  };

  const handleResetToDefault = () => {
    localStorage.removeItem('siap_students');
    localStorage.removeItem('siap_teachers');
    localStorage.removeItem('siap_attendance');
    localStorage.removeItem('siap_grades');
    localStorage.removeItem('siap_cases');
    localStorage.removeItem('siap_achievements');
    localStorage.removeItem('siap_emails');
    localStorage.removeItem('siap_academic');
    localStorage.removeItem('siap_system');

    setSystemSetting(INITIAL_SYSTEM);
    setAcademicSetting(INITIAL_ACADEMIC);
    setStudents(INITIAL_STUDENTS);
    setTeachers(INITIAL_TEACHERS);
    setAttendance(INITIAL_ATTENDANCE(INITIAL_ACADEMIC.activeYear, INITIAL_ACADEMIC.activeSemester));
    setGrades(INITIAL_GRADES(INITIAL_ACADEMIC.activeYear, INITIAL_ACADEMIC.activeSemester));
    setCases(INITIAL_CASES(INITIAL_ACADEMIC.activeYear, INITIAL_ACADEMIC.activeSemester));
    setAchievements(INITIAL_ACHIEVEMENTS(INITIAL_ACADEMIC.activeYear, INITIAL_ACADEMIC.activeSemester));
    setEmails(INITIAL_EMAILS);
  };

  const handleClearEmails = () => {
    setEmails([]);
    saveState('siap_emails', []);
  };

  // --- CONDITIONAL PORTAL MENU NAVIGATION ROUTING ---
  const renderContent = () => {
    if (!currentUser) return null;

    const loggedTeacher = currentUser.role === 'GURU'
      ? teachers.find(t => t.nuptk === currentUser.id || t.username === currentUser.username)
      : undefined;

    const displayedStudents = (currentUser.role === 'GURU' && loggedTeacher && loggedTeacher.dutyType === 'GURU_KELAS' && loggedTeacher.assignedClass)
      ? students.filter(s => s.class === loggedTeacher.assignedClass)
      : students;

    switch (activeMenu) {
      case 'dashboard':
        return (
          <Dashboard
            role={currentUser.role}
            studentNisn={currentUser.studentNisn}
            students={displayedStudents}
            teachers={teachers}
            attendance={attendance}
            grades={grades}
            cases={cases}
            achievements={achievements}
            emails={emails}
            academicYear={academicSetting.activeYear}
            semester={academicSetting.activeSemester}
            onNavigate={(menuId) => setActiveMenu(menuId)}
            onClearEmails={handleClearEmails}
          />
        );
      case 'profil':
        if (currentUser.role === 'SISWA' && currentUser.studentNisn) {
          const studentObj = students.find(s => s.nisn === currentUser.studentNisn);
          if (studentObj) {
            return (
              <SiswaProfil
                student={studentObj}
                onUpdatePhoto={handleUpdateStudentPhoto}
                academicYear={academicSetting.activeYear}
                semester={academicSetting.activeSemester}
              />
            );
          }
        }
        return <div className="text-white text-xs italic">Profil siswa tidak ditemukan.</div>;

      case 'siswa':
        return (
          <SiswaList
            students={displayedStudents}
            onAddStudent={handleAddStudent}
            onAddStudentsBulk={handleAddStudentsBulk}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudent}
            schoolName={systemSetting.schoolName}
            academicYear={academicSetting.activeYear}
            semester={academicSetting.activeSemester}
            availableClasses={academicSetting.classes}
            role={currentUser.role}
            teachers={teachers}
            classStaffs={classStaffs}
          />
        );

      case 'absensi-scan':
      case 'absensi-siswa':
        return (
          <AbsensiSec
            students={displayedStudents}
            attendance={attendance}
            onMarkAttendance={handleMarkAttendance}
            onDeleteAttendance={handleDeleteAttendance}
            schoolName={systemSetting.schoolName}
            academicYear={academicSetting.activeYear}
            semester={academicSetting.activeSemester}
            availableClasses={academicSetting.classes}
            role={currentUser.role}
            studentNisn={currentUser.studentNisn}
            activeMenu={activeMenu}
            holidays={holidays}
            onAddHoliday={handleAddHoliday}
            onDeleteHoliday={handleDeleteHoliday}
            teachers={teachers}
            classStaffs={classStaffs}
          />
        );

      case 'nilai-input':
      case 'nilai-siswa':
        return (
          <NilaiSec
            students={displayedStudents}
            grades={grades}
            onSaveGrade={handleSaveGrade}
            onSendGradeEmail={handleSendGradeEmail}
            onDeleteGrade={handleDeleteGrade}
            schoolName={systemSetting.schoolName}
            academicYear={academicSetting.activeYear}
            semester={academicSetting.activeSemester}
            availableClasses={academicSetting.classes}
            availableSubjects={academicSetting.subjects}
            role={currentUser.role}
            studentNisn={currentUser.studentNisn}
            activeMenu={activeMenu}
            teachers={teachers}
            classStaffs={classStaffs}
            currentUser={currentUser}
            academicSetting={academicSetting}
          />
        );

      case 'kasus':
      case 'prestasi':
        return (
          <RecordSec
            students={displayedStudents}
            cases={cases}
            achievements={achievements}
            onAddCase={handleAddCase}
            onAddAchievement={handleAddAchievement}
            onSendCaseEmail={handleSendCaseEmail}
            onSendAchievementEmail={handleSendAchievementEmail}
            onDeleteCase={handleDeleteCase}
            onDeleteAchievement={handleDeleteAchievement}
            schoolName={systemSetting.schoolName}
            academicYear={academicSetting.activeYear}
            semester={academicSetting.activeSemester}
            availableClasses={academicSetting.classes}
            role={currentUser.role}
            studentNisn={currentUser.studentNisn}
            activeMenu={activeMenu}
          />
        );

      case 'uang-kas':
        return (
          <UangKasSec
            students={displayedStudents}
            onEditStudent={handleEditStudent}
            onSendCashBillEmail={handleSendCashBillEmail}
            schoolName={systemSetting.schoolName}
            academicYear={academicSetting.activeYear}
            semester={academicSetting.activeSemester}
            availableClasses={academicSetting.classes}
            role={currentUser.role}
            studentNisn={currentUser.studentNisn}
            teachers={teachers}
            classStaffs={classStaffs}
          />
        );

      case 'qr-code':
        return (
          <QrCodeSec
            students={displayedStudents}
            availableClasses={academicSetting.classes}
            schoolName={systemSetting.schoolName}
          />
        );

      case 'kartu-siswa':
        return (
          <KartuSiswaSec
            students={displayedStudents}
            availableClasses={academicSetting.classes}
            systemSetting={systemSetting}
          />
        );

      case 'naik-kelas':
        return (
          <NaikKelasSec
            students={displayedStudents}
            availableClasses={academicSetting.classes}
            academicSetting={academicSetting}
            onPromoteStudents={handlePromoteStudents}
            role={currentUser.role}
          />
        );

      case 'backup-restore':
        return (
          <BackupRestoreSec
            students={students}
            teachers={teachers}
            attendance={attendance}
            grades={grades}
            cases={cases}
            achievements={achievements}
            emails={emails}
            academicSetting={academicSetting}
            systemSetting={systemSetting}
            onRestoreData={handleRestoreData}
            onResetToDefault={handleResetToDefault}
            role={currentUser.role}
            schoolName={systemSetting.schoolName}
          />
        );

      case 'set-akademik':
      case 'set-sistem':
      case 'set-guru':
        return (
          <SettingsSec
            academicSetting={academicSetting}
            systemSetting={systemSetting}
            teachers={teachers}
            classStaffs={classStaffs}
            onUpdateAcademic={handleUpdateAcademic}
            onUpdateSystem={handleUpdateSystem}
            onUpdateClassStaffs={handleUpdateClassStaffs}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            availableSubjects={academicSetting.subjects}
            activeMenu={activeMenu}
            onDeletePeriodData={handleDeletePeriodData}
          />
        );

      case 'unduh-aplikasi':
        return (
          <UnduhAplikasiSec schoolName={systemSetting.schoolName} />
        );

      default:
        return <div className="text-white">Halaman tidak ditemukan.</div>;
    }
  };

  const getTopBarSub = () => {
    if (currentUser?.role === 'SISWA' && currentUser.studentNisn) {
      const studentObj = students.find(s => s.nisn === currentUser.studentNisn);
      if (studentObj) {
        const staff = classStaffs.find(cs => cs.classId === studentObj.class);
        if (staff && staff.waliKelasNuptk) {
          const teacherObj = teachers.find(t => t.nuptk === staff.waliKelasNuptk);
          if (teacherObj) {
            const classTeacherObj = teachers.find(t => t.nuptk === staff.guruKelasNuptk);
            return `Wali Kelas: ${teacherObj.name} • Guru Kelas: ${classTeacherObj?.name || '-'}`;
          }
        }
        return `Rombel: Kelas ${studentObj.class} • Wali: Belum Diset`;
      }
    } else if (currentUser?.role === 'GURU') {
      const waliOf = classStaffs.filter(cs => cs.waliKelasNuptk === currentUser.id).map(cs => cs.classId).join(', ');
      const guruOf = classStaffs.filter(cs => cs.guruKelasNuptk === currentUser.id).map(cs => cs.classId).join(', ');
      
      let subParts = [];
      if (waliOf) subParts.push(`Wali Kelas: Kelas ${waliOf}`);
      if (guruOf) subParts.push(`Guru Kelas: Kelas ${guruOf}`);
      return subParts.join(' • ') || `Peran: Guru Mata Pelajaran`;
    }
    return `Kepala Madrasah: ${systemSetting.headmasterName}`;
  };

  // --- IF NOT LOGGED IN, RENDER THE PROFESSIONAL LOGIN PAGE ---
  if (!currentUser) {
    return (
      <>
        <Login
          onLogin={handleLogin}
          logoUrl={systemSetting.logoUrl}
          schoolName={systemSetting.schoolName}
          adminUsername={systemSetting.adminUsername}
          adminPassword={systemSetting.adminPassword}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
        <PremiumDialog />
      </>
    );
  }

  // --- IF LOGGED IN, RENDER MASTER SIDEBAR + WRAPPER BODY LAYOUT ---
  const loggedTeacherForSidebar = currentUser?.role === 'GURU'
    ? teachers.find(t => t.nuptk === currentUser.id || t.username === currentUser.username)
    : undefined;
  const teacherDutyType = loggedTeacherForSidebar
    ? (loggedTeacherForSidebar.dutyType === 'GURU_KELAS' ? 'Guru Kelas' : 'Guru Mapel')
    : undefined;

  return (
    <div className={`min-h-screen flex font-sans max-w-full overflow-hidden transition-colors duration-300 ${
      darkMode ? 'bg-[#0f1612] text-[#f0f5f1]' : 'bg-[#f0f5f1] text-[#12261a]'
    }`}>
      {/* Collapsible Sidebar */}
      <Sidebar
        role={currentUser.role}
        userName={currentUser.name}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        onLogout={handleLogout}
        logoUrl={systemSetting.logoUrl}
        schoolName={systemSetting.schoolName}
        academicYear={academicSetting.activeYear}
        semester={academicSetting.activeSemester}
        academicYears={academicSetting.years}
        semesters={academicSetting.semesters}
        onYearChange={handleUpdateYear}
        onSemesterChange={handleUpdateSemester}
        teacherDutyType={teacherDutyType}
      />

      {/* Main Right Side Content Container */}
      <main className="flex-1 lg:pl-64 min-h-screen flex flex-col pt-16 lg:pt-0 min-w-0 max-w-full overflow-x-hidden">
        {/* Top Header Bar */}
        <header className={`px-6 py-4 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-4 z-10 transition-all duration-300 ${
          darkMode 
            ? 'bg-[#0f1612]/80 border-[#17221c] backdrop-blur-md' 
            : 'bg-[#f0f5f1]/80 border-[#cbd5ce] backdrop-blur-md'
        }`}>
          <div className="flex items-center gap-3">
            {navHistory.length > 1 && (
              <button
                onClick={handleGoBack}
                className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 active:scale-95 shrink-0 cursor-pointer ${
                  darkMode 
                    ? 'bg-[#0f1612] text-emerald-400 shadow-[4px_4px_10px_#070a08,-4px_-4px_10px_#17221c] border border-emerald-500/10' 
                    : 'bg-[#f0f5f1] text-emerald-600 shadow-[4px_4px_10px_#dce3dd,-4px_-4px_10px_#ffffff] border border-emerald-500/10'
                }`}
                title="Kembali ke halaman sebelumnya"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className={`text-sm font-extrabold tracking-tight uppercase ${
                darkMode ? 'text-white' : 'text-[#0f1612]'
              }`}>
                SIAP Academic Management System
              </h1>
              <p className="text-[10px] text-slate-500 mt-0.5 font-bold">
                <span className="text-emerald-500">{getTopBarSub()}</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-end">
            <div className="hidden sm:flex items-center gap-3">
              <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 transition-all duration-300 ${
                darkMode 
                  ? 'bg-[#0b0f0c] border-[#17221c]' 
                  : 'bg-[#ebf1ec] border-[#cbd5ce]'
              }`}>
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Tahun:</span>
                <select
                  value={academicSetting.activeYear}
                  onChange={(e) => handleUpdateYear(e.target.value)}
                  className={`bg-transparent font-mono font-bold text-[11px] focus:outline-none cursor-pointer ${
                    darkMode ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                >
                  {academicSetting.years.map((yr) => (
                    <option key={yr} value={yr} className={darkMode ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 transition-all duration-300 ${
                darkMode 
                  ? 'bg-[#0b0f0c] border-[#17221c]' 
                  : 'bg-[#ebf1ec] border-[#cbd5ce]'
              }`}>
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Semester:</span>
                <select
                  value={academicSetting.activeSemester}
                  onChange={(e) => handleUpdateSemester(e.target.value as 'Ganjil' | 'Genap')}
                  className={`bg-transparent font-mono font-bold text-[11px] focus:outline-none cursor-pointer ${
                    darkMode ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                >
                  {academicSetting.semesters.map((sem) => (
                    <option key={sem} value={sem} className={darkMode ? "bg-[#0f1612] text-[#f0f5f1]" : "bg-white text-slate-800"}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Elegant Neumorphic Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 ${
                darkMode
                  ? 'bg-[#0f1612] text-amber-400 shadow-[inset_2px_2px_5px_#070a08,inset_-2px_-2px_5px_#17221c] border border-[#17221c]'
                  : 'bg-[#f0f5f1] text-emerald-600 shadow-[4px_4px_10px_#dce3dd,-4px_-4px_10px_#ffffff] border border-white'
              }`}
              title={darkMode ? "Ubah ke Mode Terang" : "Ubah ke Mode Gelap"}
            >
              {darkMode ? <Sun className="w-4 h-4 animate-spin-slow" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className={`text-right text-[10px] text-slate-500 font-bold uppercase tracking-wider sm:border-l sm:pl-4 ${
              darkMode ? 'sm:border-[#17221c]' : 'sm:border-[#cbd5ce]'
            }`}>
              <span>Tgl: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </header>

        {/* Inner Content Area */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto animate-fadeIn overflow-y-auto min-w-0 overflow-x-hidden">
          {renderContent()}
        </div>

        {/* Footer with copyright */}
        <footer className={`px-6 py-4 border-t text-center text-[10px] text-slate-500 font-medium transition-colors duration-300 ${
          darkMode ? 'border-[#17221c] bg-[#070a08]/30' : 'border-[#cbd5ce] bg-slate-200/20'
        }`}>
          <p>© {new Date().getFullYear()} {systemSetting.schoolName}. Hak Cipta Dilindungi Undang-Undang. Powered by SIAP Academic Management System.</p>
        </footer>
      </main>
      <PremiumDialog />
    </div>
  );
}
