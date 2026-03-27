import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from "@/components/ui/button";

export const PrivacyToggle: React.FC = () => {
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem('wathiqly_privacy_mode');
    if (saved === 'true') {
      setIsPrivate(true);
      document.body.classList.add('privacy-mode');
    }
  }, []);

  const togglePrivacy = () => {
    const newState = !isPrivate;
    setIsPrivate(newState);

    if (typeof window !== "undefined") {
      window.localStorage.setItem('wathiqly_privacy_mode', String(newState));
    }

    if (newState) {
      document.body.classList.add('privacy-mode');
    } else {
      document.body.classList.remove('privacy-mode');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={togglePrivacy}
      className={`flex items-center gap-2 font-arabic transition-all ${isPrivate ? 'bg-slate-100 border-slate-300' : ''}`}
    >
      {isPrivate ? (
        <>
          <EyeOff size={16} />
          <span>إظهار الأرصدة</span>
        </>
      ) : (
        <>
          <Eye size={16} />
          <span>إخفاء الأرصدة</span>
        </>
      )}
    </Button>
  );
};

// CSS to be added to index.css:
// .privacy-mode .balance-amount {
//   filter: blur(8px);
//   transition: filter 0.3s ease;
// }
// .privacy-mode .balance-amount:hover {
//   filter: blur(0);
// }
