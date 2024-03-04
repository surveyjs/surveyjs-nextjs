import Link from 'next/link'
import Image from "next/image";

/**
 * The shared header component.
 */
export default function Header() {
  return (
    <header className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
      <h1 className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
            <Image
                className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert h-8"
                src="/next.svg"
                alt="Next.js Logo"
                width={180}
                height={37}
                priority
            />
        </Link>
      </h1>
      <nav className="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
          <Link
            className="block py-2 px-3 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 dark:text-white md:dark:text-blue-500"
            key={2}
            href={{pathname: "/survey"}}
            prefetch={false}
          >
            {"Form Library"}
          </Link>
          <Link
            className="block py-2 px-3 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 dark:text-white md:dark:text-blue-500"
            key={3}
            href={{pathname: "/creator"}}
            prefetch={false}
          >
            {"Survey Creator"}
          </Link>
          <Link
            className="block py-2 px-3 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 dark:text-white md:dark:text-blue-500"
            key={4}
            href={{pathname: "/dashboard"}}
            prefetch={false}
          >
            {"Dashboard"}
          </Link>
          <Link
            className="block py-2 px-3 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 dark:text-white md:dark:text-blue-500"
            key={6}
            href={{pathname: "/tabulator"}}
            prefetch={false}
          >
            {"Results Table"}
          </Link>
          <Link
            className="block py-2 px-3 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 dark:text-white md:dark:text-blue-500"
            key={5}
            href={{pathname: "/datatables"}}
            prefetch={false}
          >
            {"Results Table (IE Support)"}
          </Link>
          <Link
            className="block py-2 px-3 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 dark:text-white md:dark:text-blue-500"
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