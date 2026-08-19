import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Wallet, ReceiptText, ArrowLeftRight, Users, X } from "lucide-react";
import AddTransactionModal from "../transactions/AddTransactionModal.jsx";

const OPTIONS = [
  { key: "expense", label: "Gider", icon: ReceiptText },
  { key: "income", label: "Gelir", icon: Wallet },
  { key: "transfer", label: "Transfer", icon: ArrowLeftRight },
  { key: "debt", label: "Borç/Alacak", icon: Users },
];

export default function QuickActionFab() {
  const [open, setOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const navigate = useNavigate();

  const pick = (key) => {
    setOpen(false);
    if (key === "debt") navigate("/app/borclar", { state: { openAdd: true } });
    else setModalType(key);
  };

  return (
    <>
      <div className={`fab-wrap ${open ? "open" : ""}`}>
        {open && (
          <div className="fab-menu">
            {OPTIONS.map((o) => (
              <button key={o.key} className="fab-option" onClick={() => pick(o.key)}>
                <o.icon size={16} /> {o.label}
              </button>
            ))}
          </div>
        )}
        <button className="fab-main" onClick={() => setOpen((x) => !x)} aria-label="Hızlı İşlem">
          {open ? <X size={22} /> : <Plus size={22} />}
        </button>
      </div>
      {modalType && <AddTransactionModal initialType={modalType} onClose={() => setModalType(null)} />}
    </>
  );
}
