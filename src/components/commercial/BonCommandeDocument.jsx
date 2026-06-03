import React, { useMemo } from "react";
import { ISMAWOOD_COMPANY } from "../../constants/ismawoodCompany";
import IsmawoodLogo from "./IsmawoodLogo";
import {
  formatBonMoney,
  formatBonDateFr,
  BON_STATUT_LABEL,
  groupLignesByModele,
  ligneSousTotal,
  BON_PRINT_ROOT_ID,
} from "../../utils/bonDocumentFormat";

const formatDateShort = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const SignatureBlock = ({ label }) => (
  <div className="flex-1 min-w-[120px]">
    <p className="text-[10px] font-bold text-[#4B3621] mb-1">{label}</p>
    <div className="h-12 border border-dashed border-[#d4c4b0] rounded-lg bg-[#faf7f2]" />
  </div>
);

const BonCommandeDocument = ({
  bon,
  lignes,
  isPreview = false,
  onClose,
  onPrint,
  onDownloadPdf,
  onWhatsApp,
  onValidate,
  onCancelPreview,
  validating = false,
}) => {
  if (!bon) return null;

  const total = parseFloat(bon.total_ht) || 0;
  const groups = useMemo(() => groupLignesByModele(lignes), [lignes]);
  const flatRows = useMemo(
    () =>
      groups.flatMap(([nomModele, items]) =>
        items.map((l) => ({ ...l, nom_modele: nomModele }))
      ),
    [groups]
  );

  return (
    <div
      id={BON_PRINT_ROOT_ID}
      className="bon-one-page bg-white w-[210mm] max-w-full mx-auto shadow-xl border border-[#e8dfd5] overflow-hidden text-[12px] leading-normal print:shadow-none print:w-full print:max-h-[287mm]"
    >
      {/* En-tête compact */}
      <div className="bg-[#4B3621] text-white px-6 py-4 flex items-center justify-between gap-4 print:bg-[#4B3621]">
        <div className="flex items-center gap-3 min-w-0">
          <IsmawoodLogo variant="light" className="h-12 w-auto shrink-0" />
          <div className="min-w-0 hidden sm:block">
            <p className="font-black text-base leading-tight">{ISMAWOOD_COMPANY.nom}</p>
            <p className="text-[11px] text-white/85 truncate">{ISMAWOOD_COMPANY.telephone}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] uppercase tracking-wider text-[#9DC183] font-bold">
            Bon de commande
          </p>
          <p className="text-2xl font-black leading-tight">{bon.reference}</p>
          <p className="text-[11px] text-white/85">{formatDateShort(bon.created_at)}</p>
          {isPreview && (
            <span className="inline-block mt-1 px-2.5 py-1 rounded bg-amber-400 text-[#4B3621] text-[10px] font-black uppercase">
              Aperçu
            </span>
          )}
        </div>
      </div>

      <div className="bon-no-pdf flex flex-wrap gap-2 px-6 py-3 bg-[#faf7f2] border-b border-[#efe8df] print:hidden">
        {isPreview ? (
          <>
            {onDownloadPdf && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="px-4 py-2 rounded-xl bg-[#9DC183] text-[#4B3621] font-bold text-sm"
              >
                📄 Télécharger PDF
              </button>
            )}
            <button
              type="button"
              onClick={onValidate}
              disabled={validating}
              className="px-4 py-2 rounded-xl bg-[#4B3621] text-[#9DC183] font-bold text-sm disabled:opacity-50"
            >
              {validating ? "Validation…" : "Valider la commande"}
            </button>
            <button
              type="button"
              onClick={onCancelPreview}
              disabled={validating}
              className="px-4 py-2 rounded-xl border border-[#4B3621] text-[#4B3621] font-bold text-sm"
            >
              Retour
            </button>
          </>
        ) : (
          <>
            {onDownloadPdf && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="px-4 py-2 rounded-xl bg-[#9DC183] text-[#4B3621] font-bold text-sm"
              >
                📄 Télécharger PDF
              </button>
            )}
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="px-4 py-2 rounded-xl border border-[#4B3621] text-[#4B3621] font-semibold text-sm"
              >
                🖨 Imprimer
              </button>
            )}
            {onWhatsApp && (
              <button
                type="button"
                onClick={onWhatsApp}
                className="px-4 py-2 rounded-xl bg-green-600 text-white font-bold text-sm"
              >
                📱 Envoyer WhatsApp
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#f5ede3] text-[#4B3621] font-semibold text-sm"
              >
                Nouvelle commande
              </button>
            )}
          </>
        )}
      </div>

      {/* Client + infos — une ligne compacte */}
      <div
        className="grid grid-cols-2 gap-4 px-6 py-4 border-b border-[#efe8df]"
        style={{ backgroundColor: 'rgba(250, 247, 242, 0.5)' }}
      >
        <div>
          <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Client</p>
          <p className="font-bold text-[#4B3621] text-xl">{bon.nom_client}</p>
          <div className="text-[11px] text-gray-700 mt-0.5 space-y-0">
            {bon.telephone && <p>Tél. {bon.telephone}</p>}
            {bon.email && <p>{bon.email}</p>}
            {bon.ville && <p>{bon.ville}</p>}
            {bon.adresse && <p className="line-clamp-2">{bon.adresse}</p>}
          </div>
        </div>
        <div className="text-right text-[11px]">
          <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Informations</p>
          <p>
            <span className="text-gray-500">Date : </span>
            <span className="font-semibold">{formatBonDateFr(bon.created_at)}</span>
          </p>
          <p className="mt-0.5">
            <span className="text-gray-500">N° : </span>
            <span className="font-bold text-[#4B3621]">{bon.reference}</span>
          </p>
          {bon.statut && (
            <p className="mt-1">
              <span className="inline-block px-3 py-1 rounded-full bg-[#f5ede3] font-bold text-[#4B3621]">
                {BON_STATUT_LABEL[bon.statut] || bon.statut}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Tableau unique — toutes les lignes */}
      <div className="px-6 py-3">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#f0e9df] text-[10px] uppercase">
              <th className="border border-[#e8dfd5] px-3 py-2 text-left font-black text-[#4B3621] w-[18%]">
                Modèle
              </th>
              <th className="border border-[#e8dfd5] px-3 py-2 text-left font-black text-[#4B3621]">
                Désignation
              </th>
              <th className="border border-[#e8dfd5] px-3 py-2 text-right font-black w-16">
                Qté m³
              </th>
              <th className="border border-[#e8dfd5] px-3 py-2 text-right font-black w-20">
                P.U.
              </th>
              <th className="border border-[#e8dfd5] px-3 py-2 text-right font-black w-20">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {flatRows.map((l, i) => (
              <tr
                key={l.id_ligne || l.lineId || i}
                style={i % 2 === 1 ? { backgroundColor: 'rgba(250, 247, 242, 0.6)' } : undefined}
              >
                <td className="border border-[#f1e9df] px-3 py-2 font-semibold text-[#6d5035] align-top">
                  {l.nom_modele}
                </td>
                <td className="border border-[#f1e9df] px-3 py-2 text-[#3d2c1c] align-top">
                  {l.designation || "—"}
                </td>
                <td className="border border-[#f1e9df] px-3 py-2 text-right align-top">
                  {l.quantite}
                </td>
                <td className="border border-[#f1e9df] px-3 py-2 text-right align-top whitespace-nowrap">
                  {formatBonMoney(l.prix_unitaire ?? l.prix_unitaire_ht)}
                </td>
                <td className="border border-[#f1e9df] px-3 py-2 text-right font-bold text-[#4B3621] align-top whitespace-nowrap">
                  {formatBonMoney(ligneSousTotal(l))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 flex justify-end border-t border-[#efe8df]">
        <div className="flex gap-4 items-center text-lg font-black text-[#4B3621]">
          <span>Total commande</span>
          <span>{formatBonMoney(total)}</span>
        </div>
      </div>

      {bon.remarque && (
        <div className="px-6 py-2 border-t border-[#efe8df] text-[11px]">
          <span className="font-bold text-[#4B3621]">Remarque : </span>
          <span className="text-gray-600">{bon.remarque}</span>
        </div>
      )}

      <div className="px-6 py-3 border-t border-[#efe8df] flex gap-3">
        <SignatureBlock label="Signature client" />
        <SignatureBlock label="Signature directeur" />
        <div className="w-20 shrink-0 text-center">
          <p className="text-[10px] font-bold text-[#4B3621] mb-1">Cachet</p>
          <div className="h-12 w-12 mx-auto border border-dashed border-[#d4c4b0] rounded-full bg-[#faf7f2]" />
        </div>
      </div>

      <div className="px-6 py-3 bg-[#f8f5f1] border-t border-[#efe8df] text-[10px] text-gray-700 leading-relaxed">
        <p className="font-bold text-[#4B3621]">{ISMAWOOD_COMPANY.nom}</p>
        <p>
          {ISMAWOOD_COMPANY.siege.replace(/\n/g, " · ")} — {ISMAWOOD_COMPANY.usine} —{" "}
          {ISMAWOOD_COMPANY.telephone} — {ISMAWOOD_COMPANY.email}
        </p>
        <p className="italic text-gray-400 mt-1 text-center">
          Document de commande — non valable comme facture définitive.
        </p>
      </div>
    </div>
  );
};

export default BonCommandeDocument;
