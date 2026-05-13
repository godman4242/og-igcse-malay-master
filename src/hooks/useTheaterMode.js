import { useContext } from 'react'
import { TheaterModeContext } from '../contexts/TheaterModeContext'

export default function useTheaterMode() {
  return useContext(TheaterModeContext)
}
