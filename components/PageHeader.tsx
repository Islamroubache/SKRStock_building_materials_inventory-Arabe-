import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    Icon: LucideIcon;
    children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, Icon, children }) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 w-full">
            <div className="flex items-center gap-4">
                <div className="bg-[#8b5cf6]/10 p-3 rounded-2xl text-[#8b5cf6] shadow-sm">
                    <Icon size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-[#8b5cf6] tracking-tight">{title}</h1>
                    <p className="text-[#fbb815] font-bold mt-1">{subtitle}</p>
                </div>
            </div>
            {children && (
                <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                    {children}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
