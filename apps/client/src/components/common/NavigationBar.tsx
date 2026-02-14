import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export interface TabItem {
    id: string;
    label: string;
    icon?: LucideIcon;
}

interface NavigationBarProps<T extends string> {
    tabs: TabItem[];
    activeTab: T;
    onTabChange: (tabId: T) => void;
    className?: string; // 추가 스타일링을 위한 className
}

export default function NavigationBar<T extends string>({ 
    tabs, 
    activeTab, 
    onTabChange,
    className = ''
}: NavigationBarProps<T>) {
    return (
        <div className={`flex items-center justify-center gap-2 mb-6 p-1.5 rounded-2xl bg-white/5 backdrop-blur-md ${className}`}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id as T)}
                        className={`
                            relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                            ${isActive ? 'text-white' : 'text-text-sub hover:text-white hover:bg-white/5'}
                        `}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-primary/20 border border-primary/30 rounded-xl shadow-[0_0_15px_rgba(var(--color-primary),0.3)]"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {tab.icon && <tab.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : ''}`} />}
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
