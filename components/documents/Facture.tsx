'use client';

import React from 'react';

interface FactureProps {
    settings: any;
    order: any;
    items: any[];
}

function formatNum(n: number | undefined | null): string {
    if (n === undefined || n === null) return '0.00';
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateFr(d?: string | Date | null): string {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toFrenchWords(amount: number): string {
    // Simple French number to words - abbreviated
    if (amount === 0) return 'ZÉRO DINAR';
    const rounded = Math.round(amount * 100);
    const dinars = Math.floor(rounded / 100);
    const centimes = rounded % 100;
    return `${dinars.toLocaleString('fr-FR')} DINARS${centimes > 0 ? ` ET ${centimes} CENTIMES` : ''}`;
}

export const Facture: React.FC<FactureProps> = ({ settings, order, items }) => {
    const subtotalHT = items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const tvaRate = order?.taxRate || settings?.tvaRate || 19;
    const taxTotal = order?.taxTotal ?? (order?.taxRate ? subtotalHT * (order.taxRate / 100) : 0);
    const timbreAmount = order?.timbreAmount ?? 0;
    const grandTotal = order?.grandTotal ?? (subtotalHT + taxTotal + timbreAmount);

    const invoiceNumber = order?.invoice?.invoiceNumber || order?.orderNumber || '—';
    const invoiceDate = formatDateFr(order?.orderDate || new Date());

    const clientName = order?.customer?.name || order?.customerName || '';
    const clientAddress = order?.customer?.address || '';
    const clientRC = order?.customer?.rc || order?.customerRC || '';
    const clientNIF = order?.customer?.nif || order?.customerNIF || '';
    const clientAI = order?.customer?.ai || order?.customerAI || '';
    const clientNIS = order?.customer?.nis || order?.customerNIS || '';
    const clientActivity = '';

    const paymentMethod = order?.paymentMethod === 'CHEQUE' ? 'CHEQUE' : order?.paymentMethod === 'BANK_TRANSFER' ? 'VIREMENT' : 'ESPÈCES';

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#000', background: '#fff', padding: '15px 20px', maxWidth: '21cm', margin: '0 auto', minHeight: '29.7cm', boxSizing: 'border-box' }}>
            <style>{`
                @media print {
                    @page { size: A4; margin: 8mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                .fac-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
                .fac-table th { border: 1px solid #000; padding: 4px 5px; text-align: left; font-size: 9px; font-weight: bold; background: #fff; }
                .fac-table td { border: 1px solid #000; padding: 3px 5px; font-size: 10px; height: 17px; vertical-align: middle; }
                .fac-table .center { text-align: center; }
                .fac-table .right { text-align: right; }
            `}</style>

            {/* ─── HEADER ─── */}
            <div style={{ border: '1px solid #000', marginBottom: '0' }}>
                {/* Top row: Logo + Store name centered + nothing right */}
                <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #000' }}>
                    {/* Logo */}
                    <div style={{ width: '80px', borderRight: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
                        {settings?.logo
                            ? <img src={settings.logo} alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                            : <div style={{ width: '70px', height: '70px', border: '1px dashed #999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#aaa' }}>LOGO</div>
                        }
                    </div>
                    {/* Store Info */}
                    <div style={{ flex: 1, padding: '6px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{settings?.storeName || 'MAGASIN'}</div>
                        {settings?.nif && <div style={{ fontSize: '9px', marginTop: '2px' }}>{settings.nif}</div>}
                        {settings?.address && <div style={{ fontSize: '9px' }}>Adresse : {settings.address}</div>}
                    </div>
                    {/* Right col empty or for extra info */}
                    <div style={{ width: '160px', borderLeft: '1px solid #000', padding: '4px 6px', fontSize: '9px' }}>
                        {settings?.rc && <div>R. C.N° : {settings.rc}</div>}
                        {settings?.nif && <div>M. Fiscal : {settings.nif}</div>}
                        {settings?.phone && <div>Compte N° : {settings.phone}</div>}
                    </div>
                </div>

                {/* Second row: RC + AI + NIS side by side */}
                <div style={{ display: 'flex', borderBottom: '1px solid #000', fontSize: '9px', padding: '3px 8px', gap: '16px' }}>
                    {settings?.ai && <span>A. I. N° : {settings.ai}</span>}
                    {settings?.nis && <span>NIS : {settings.nis}</span>}
                    <span>Capital : 0</span>
                </div>
            </div>

            {/* ─── FACTURE NUMBER BANNER ─── */}
            <div style={{ border: '1px solid #000', borderTop: 'none', textAlign: 'center', padding: '5px 0', background: '#fff', marginBottom: '0' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>FACTURE N° : {invoiceNumber}</span>
                <span style={{ fontSize: '9px', marginRight: '12px' }}>SIDI AISSA / MSILA Le, {invoiceDate}</span>
            </div>

            {/* ─── CLIENT + REFERENCE CLIENT ─── */}
            <div style={{ display: 'flex', border: '1px solid #000', borderTop: 'none', marginBottom: '0' }}>
                {/* Doit (Client info) */}
                <div style={{ flex: 1, borderRight: '1px solid #000', padding: '5px 8px', fontSize: '9px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Doit :</div>
                    <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{clientName}</div>
                    {clientAddress && <div>Adresse : {clientAddress}</div>}
                    {clientActivity && <div>Activité : {clientActivity}</div>}
                </div>
                {/* Référence Client */}
                <div style={{ width: '220px', padding: '5px 8px', fontSize: '9px' }}>
                    <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '3px' }}>Référence Client</div>
                    <table style={{ width: '100%', fontSize: '9px' }}>
                        <tbody>
                            <tr>
                                <td style={{ fontWeight: 'bold', paddingRight: '4px' }}>R. C.N° :</td>
                                <td>{clientRC}</td>
                                <td style={{ fontWeight: 'bold', paddingRight: '4px' }}>A. I. N° :</td>
                                <td>{clientAI}</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold', paddingRight: '4px' }}>M. Fiscal :</td>
                                <td>{clientNIF}</td>
                                <td style={{ fontWeight: 'bold', paddingRight: '4px' }}>NIS :</td>
                                <td>{clientNIS}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── TABLE ─── */}
            <table className="fac-table">
                <thead>
                    <tr>
                        <th style={{ width: '24px' }} className="center">N°</th>
                        <th style={{ width: '70px' }}>Référence</th>
                        <th>Désignation</th>
                        <th style={{ width: '30px' }} className="center">Unité</th>
                        <th style={{ width: '60px' }} className="center">Qte</th>
                        <th style={{ width: '75px' }} className="right">P.U. HT</th>
                        <th style={{ width: '40px' }} className="center">TVA</th>
                        <th style={{ width: '80px' }} className="right">Montant HT</th>
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
                            <td className="center">{tvaRate}</td>
                            <td className="right">{formatNum(item.quantity * item.unitPrice)}</td>
                        </tr>
                    ))}
                    {/* Empty rows */}
                    {[...Array(Math.max(0, 16 - items.length))].map((_, i) => (
                        <tr key={`e-${i}`}>
                            <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* ─── TOTALS + AMOUNT IN WORDS ─── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', alignItems: 'flex-start' }}>
                {/* Left: amount in words + payment info */}
                <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '9px', marginBottom: '4px', textDecoration: 'underline' }}>Arretée la présente Facture à la somme de :</div>
                    <div style={{ fontSize: '9px', fontStyle: 'italic' }}>{toFrenchWords(grandTotal)}</div>

                    <div style={{ marginTop: '16px', fontSize: '9px' }}>
                        <div>Votre Commande n° : <span style={{ borderBottom: '1px solid #000', minWidth: '80px', display: 'inline-block' }}></span></div>
                        <div style={{ marginTop: '4px' }}>Mode de paiement : <strong>{paymentMethod}</strong></div>
                        <div style={{ marginTop: '4px' }}>Date de paiement : <span style={{ borderBottom: '1px solid #000', minWidth: '80px', display: 'inline-block' }}></span></div>
                        <div style={{ marginTop: '4px' }}>Références règlement : <span style={{ borderBottom: '1px solid #000', minWidth: '60px', display: 'inline-block' }}>{order?.chequeNumber || ''}</span></div>
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '9px' }}>
                        <div>Chauffeur : <span style={{ borderBottom: '1px solid #000', minWidth: '100px', display: 'inline-block' }}></span></div>
                        <div style={{ marginTop: '4px' }}>Matricule : <span style={{ borderBottom: '1px solid #000', minWidth: '100px', display: 'inline-block' }}></span></div>
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '9px' }}>
                        Proforma n° : <span style={{ borderBottom: '1px solid #000', minWidth: '80px', display: 'inline-block' }}>{invoiceNumber}</span>
                    </div>
                </div>

                {/* Right: Totals table */}
                <div style={{ width: '200px', border: '1px solid #000' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', padding: '4px 8px', fontSize: '10px' }}>
                        <span style={{ fontWeight: 'bold' }}>TOTAL H.T</span>
                        <span>{formatNum(subtotalHT)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', padding: '4px 8px', fontSize: '10px', background: '#f0f0f0' }}>
                        <span style={{ fontWeight: 'bold' }}>TOTAL T.V.A</span>
                        <span>{formatNum(taxTotal)}</span>
                    </div>
                    {timbreAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', padding: '4px 8px', fontSize: '10px' }}>
                            <span style={{ fontWeight: 'bold' }}>Timbre</span>
                            <span>{formatNum(timbreAmount)}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', fontSize: '12px', fontWeight: 'bold', borderTop: '2px solid #000' }}>
                        <span>TOTAL T.T.C</span>
                        <span>{formatNum(grandTotal)}</span>
                    </div>
                </div>
            </div>

            {/* ─── SIGNATURES ─── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '40px' }}>
                <div style={{ textAlign: 'center', fontSize: '9px' }}>
                    <div style={{ border: '1px solid #ccc', width: '120px', height: '60px', marginBottom: '4px' }}></div>
                    <div>Signature Client</div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '9px' }}>
                    <div style={{ border: '1px solid #ccc', width: '120px', height: '60px', marginBottom: '4px' }}></div>
                    <div>Cachet et Signature</div>
                </div>
            </div>

            {/* ─── PAGE FOOTER ─── */}
            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '9px', borderTop: '1px solid #ccc', paddingTop: '4px', color: '#555' }}>
                1 sur 1
            </div>
        </div>
    );
};
