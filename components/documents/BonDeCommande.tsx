'use client';

import React from 'react';

interface BonDeCommandeProps {
    settings: any;
    order: any;
    items: any[];
}

function formatNum(n: number | undefined | null): string {
    if (!n && n !== 0) return '';
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateFr(d?: string | Date | null): string {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const BonDeCommande: React.FC<BonDeCommandeProps> = ({ settings, order, items }) => {
    const subtotal = items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const remise = 0;
    const net = subtotal - remise;
    const ancienSolde = order?.customer?.balanceDue ?? 0;
    const versement = order?.paid ?? 0;
    const nouveauSolde = ancienSolde + net - versement;

    // Generate a BL number from the order number
    const blNumber = order?.orderNumber || '000001/25';
    const today = formatDateFr(order?.orderDate || new Date());
    const now = new Date(order?.orderDate || new Date());
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const clientName = order?.customer?.name || order?.customerName || '';
    const clientAddress = order?.customer?.address || '';

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', background: '#fff', padding: '20px 24px', maxWidth: '21cm', margin: '0 auto', minHeight: '29.7cm', boxSizing: 'border-box' }}>
            <style>{`
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                .bon-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                .bon-table th { background: #fff; border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 10px; font-weight: bold; }
                .bon-table td { border: 1px solid #000; padding: 3px 6px; font-size: 10px; height: 18px; }
                .bon-table .center { text-align: center; }
                .bon-table .right { text-align: right; }
            `}</style>

            {/* ─── HEADER ─── */}
            <div style={{ marginBottom: '6px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{settings?.storeName || 'MAGASIN'}</div>
                {settings?.rc && <div style={{ fontSize: '10px' }}>R.C.N° : {settings.rc}</div>}
                {settings?.nif && <div style={{ fontSize: '10px' }}>M. Fiscal : {settings.nif}</div>}
                {settings?.address && <div style={{ fontSize: '10px' }}>Adresse : {settings.address}</div>}
                <div style={{ fontSize: '10px' }}>
                    {settings?.phone && <>Tel : {settings.phone}&nbsp;&nbsp;&nbsp;</>}
                    {settings?.email && <>Mobile : {settings.email}</>}
                </div>
            </div>

            {/* ─── TITLE ─── */}
            <div style={{ textAlign: 'center', margin: '10px 0 8px', borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '5px 0' }}>
                <span style={{ fontWeight: 'bold', fontSize: '15px', letterSpacing: '2px' }}>BON DE LIVRAISON</span>
                <span style={{ fontSize: '10px', marginRight: '16px' }}>Edité le : {today} {timeStr}</span>
            </div>

            {/* ─── CLIENT + BL INFO ─── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {/* Client Box */}
                <div style={{ flex: 1, border: '1px solid #000' }}>
                    <div style={{ background: '#e8e8e8', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000', padding: '2px' }}>Client</div>
                    <div style={{ padding: '4px 6px', minHeight: '48px' }}>
                        <div><span style={{ fontWeight: 'bold' }}>Raison Sociale :</span> {clientName}</div>
                        <div><span style={{ fontWeight: 'bold' }}>Adresse :</span> {clientAddress}</div>
                        {order?.customer?.phone && <div><span style={{ fontWeight: 'bold' }}>Tel :</span> {order.customer.phone}</div>}
                    </div>
                </div>
                {/* BL Info Box */}
                <div style={{ width: '200px', border: '1px solid #000' }}>
                    <div style={{ background: '#e8e8e8', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000', padding: '2px' }}>Bon de Livraison</div>
                    <div style={{ padding: '4px 6px' }}>
                        <div><span style={{ fontWeight: 'bold' }}>BL N° :</span> {blNumber}</div>
                        <div><span style={{ fontWeight: 'bold' }}>Etabli le :</span> {today}</div>
                        <div><span style={{ fontWeight: 'bold' }}>BC N° :</span></div>
                    </div>
                </div>
            </div>

            {/* ─── TABLE ─── */}
            <table className="bon-table">
                <thead>
                    <tr>
                        <th style={{ width: '28px' }} className="center">NL</th>
                        <th style={{ width: '70px' }}>Réf. Prod.</th>
                        <th>Désignation du Produit</th>
                        <th style={{ width: '30px' }} className="center">UM</th>
                        <th style={{ width: '60px' }} className="center">Quantité</th>
                        <th style={{ width: '80px' }} className="right">Prix Unitaire</th>
                        <th style={{ width: '80px' }} className="right">Montant</th>
                        <th style={{ width: '55px' }} className="right">Remise</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="center">{idx + 1}</td>
                            <td>{item.product?.code || ''}</td>
                            <td style={{ fontWeight: 'bold' }}>{item.product?.name || ''}</td>
                            <td className="center">{item.product?.unit || 'U'}</td>
                            <td className="center">{item.quantity}</td>
                            <td className="right">{formatNum(item.unitPrice)}</td>
                            <td className="right">{formatNum(item.quantity * item.unitPrice)}</td>
                            <td className="right"></td>
                        </tr>
                    ))}
                    {/* Empty rows */}
                    {[...Array(Math.max(0, 20 - items.length))].map((_, i) => (
                        <tr key={`e-${i}`}>
                            <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* ─── TOTALS FOOTER ─── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px', gap: '16px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                <span><strong>Montant :</strong> {formatNum(subtotal)}</span>
                <span><strong>Remise :</strong> {formatNum(remise)}</span>
                <span><strong>Montant Net :</strong> {formatNum(net)}</span>
            </div>

            {/* ─── BALANCE FOOTER ─── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', borderTop: '1px solid #000', paddingTop: '4px', fontSize: '10px' }}>
                <span><strong>Ancien Solde :</strong> {formatNum(ancienSolde)}</span>
                <span><strong>Versement :</strong> {formatNum(versement)}</span>
                <span><strong>Nouveau Solde :</strong> {formatNum(nouveauSolde)}</span>
            </div>

            {/* ─── SIGNATURES ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ border: '1px solid #ccc', height: '60px', marginBottom: '4px' }}></div>
                    <div style={{ fontSize: '9px' }}>Signature Client</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ border: '1px solid #ccc', height: '60px', marginBottom: '4px' }}></div>
                    <div style={{ fontSize: '9px' }}>Signature et Cachet</div>
                </div>
            </div>

            {/* ─── PAGE NUMBER ─── */}
            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '9px', borderTop: '1px solid #ccc', paddingTop: '4px' }}>
                Page : 1 / 1
            </div>
        </div>
    );
};
