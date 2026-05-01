import Image from 'next/image'

export function Logo({ className = "w-16 h-16" }: { className?: string }) {
    return (
        <div className={`relative items-center justify-center ${className}`}>
            <Image
                src="/logo.png"
                alt="برنامج إدارة محل Logo"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain p-1"
                priority
            />
        </div>
    )
}
