export interface ChoiceOption {
  value: string
  label: string
  description?: string
  testId?: string
}

export interface CheckboxFieldProps {
  checked: boolean
  label: string
  description?: string
  testId?: string
}

export interface RadioFieldProps {
  checked: boolean
  label: string
  description?: string
  testId?: string
}

export interface SelectFieldProps {
  label: string
  description?: string
  testId?: string
  controlTestId?: string
  value: string
  options: string[]
}

export function CheckboxField(props: CheckboxFieldProps) {
  return (
    <HStack testId={props.testId} className="items-start gap-3">
      <Checkbox checked={props.checked} label="" />
      <VStack className="gap-1">
        <Text className="text-sm font-semibold text-white">{props.label}</Text>
        {(props.description.len > 0) ? <Text className="text-xs text-white/55">{props.description}</Text> : <View />}
      </VStack>
    </HStack>
  )
}

export function RadioField(props: RadioFieldProps) {
  return (
    <HStack testId={props.testId} className="items-start gap-3">
      <Radio checked={props.checked} label="" />
      <VStack className="gap-1">
        <Text className="text-sm font-semibold text-white">{props.label}</Text>
        {(props.description.len > 0) ? <Text className="text-xs text-white/55">{props.description}</Text> : <View />}
      </VStack>
    </HStack>
  )
}

export function SelectField(props: SelectFieldProps) {
  return (
    <VStack testId={props.testId} className="gap-2">
      <Text className="text-sm font-semibold text-white">{props.label}</Text>
      <Select testId={props.controlTestId} value={props.value} options={props.options} className="w-[160]" />
      {(props.description.len > 0) ? <Text className="text-xs text-white/55">{props.description}</Text> : <View />}
    </VStack>
  )
}
