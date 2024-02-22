import Link from 'next/link'
import Image from "next/image";

/**
 * The shared header component.
 */
export default function Header() {
  return (
    <header className="text-center sm:text-left">
      <h1>
        <Link href="/">
            <Image
                className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert"
                src="/next.svg"
                alt="Next.js Logo"
                width={180}
                height={37}
                priority
            />
        </Link>
      </h1>
      <nav className="flex flex-row gap-4">
        <Link
            className="text-base underline hover:no-underline"
            key={1}
            href={{pathname: "/home"}}
            prefetch={false}
          >
            {"Home"}
          </Link>
          <Link
            className="text-base underline hover:no-underline"
            key={2}
            href={{pathname: "/survey"}}
            prefetch={false}
          >
            {"Form Library"}
          </Link>
          <Link
            className="text-base underline hover:no-underline"
            key={3}
            href={{pathname: "/creator"}}
            prefetch={false}
          >
            {"Survey Creator"}
          </Link>
          <Link
            className="text-base underline hover:no-underline"
            key={4}
            href={{pathname: "/dashboard"}}
            prefetch={false}
          >
            {"Dashboard"}
          </Link>
          <Link
            className="text-base underline hover:no-underline"
            key={6}
            href={{pathname: "/tabulator"}}
            prefetch={false}
          >
            {"Results Table"}
          </Link>
          <Link
            className="text-base underline hover:no-underline"
            key={5}
            href={{pathname: "/datatables"}}
            prefetch={false}
          >
            {"Results Table (IE Support)"}
          </Link>
          <Link
            className="text-base underline hover:no-underline"
            key={7}
            href={{pathname: "/pdf-export"}}
            prefetch={false}
          >
            {"PDF Generator"}
          </Link>
      </nav>
    </header>
  )
}