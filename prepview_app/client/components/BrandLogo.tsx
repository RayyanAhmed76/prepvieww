import Image from 'next/image'
import Link from 'next/link'

type BrandLogoProps = {
  className?: string
  /** Set true for above-the-fold nav so LCP is optimized */
  priority?: boolean
  /** When false, renders logo without linking (e.g. interview shell) */
  linkToHome?: boolean
}

export default function BrandLogo({
  className =
    'h-12 w-auto max-w-[min(85vw,300px)] object-contain sm:h-12 sm:max-w-[300px] md:h-12 md:max-w-[300px] lg:h-14 lg:max-w-[360px] xl:h-[3.75rem] xl:max-w-[400px]',
  priority = false,
  linkToHome = true,
}: BrandLogoProps) {
  const image = (
    <Image
      src="/logo.png"
      alt="PrepView — AI Interview Simulation"
      width={510}
      height={180}
      className={`block object-contain object-left ${className}`}
      priority={priority}
    />
  )

  if (!linkToHome) {
    return (
      <span className="inline-flex min-w-0 shrink-0 items-center leading-none">{image}</span>
    )
  }

  return (
    <Link
      href="/"
      className="inline-flex min-w-0 shrink-0 items-center leading-none"
    >
      {image}
    </Link>
  )
}
