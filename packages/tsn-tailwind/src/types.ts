export interface TailwindResult {
  calls: string[]
  textSize: number
  textBold: boolean
  textWeight: number     /* -1=unset, 0=thin..4=regular..6=semibold..7=bold..9=black */
  textLineHeight: number /* -1=unset, or multiplier like 1.2 */
  textTracking: number   /* NaN=unset, or kern in points */
  textTransform: number  /* 0=none, 1=uppercase, 2=lowercase */
  textAlign: number      /* -1=unset, 0=left, 1=center, 2=right */
  width: number
  height: number
}
