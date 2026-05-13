import { createContext } from 'react'

export const TheaterModeContext = createContext({
  theaterMode: false,
  setTheaterMode: () => {},
})
