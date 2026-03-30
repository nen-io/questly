import { useEffect } from 'react'

export function useClampPage(
  page: number,
  totalPages: number | undefined,
  setPage: (page: number) => void,
) {
  useEffect(() => {
    if (totalPages === undefined) {
      return
    }

    const nextPage = totalPages <= 0 ? 1 : Math.min(page, totalPages)
    if (nextPage !== page) {
      setPage(nextPage)
    }
  }, [page, setPage, totalPages])
}
