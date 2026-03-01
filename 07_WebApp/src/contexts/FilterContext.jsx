import { createContext, useContext } from 'react'

const FilterContext = createContext(null)

export const useFilterContext = () => useContext(FilterContext)
export default FilterContext
