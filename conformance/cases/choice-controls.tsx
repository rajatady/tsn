import { CheckboxField, RadioField } from '../../packages/tsn-ui/src/helpers'

export function ChoiceControlsCase() {
  return (
    <VStack testId="root" className="gap-4 w-[560] h-[320] bg-zinc-900 p-5">
      <VStack testId="select-field" className="gap-2">
        <Text className="text-sm font-semibold text-white">Priority</Text>
        <Select
          testId="select"
          value="Medium"
          options={['Low', 'Medium', 'High']}
          className="w-[160]"
        />
        <Text className="text-xs text-white/55">Select control with low-level primitive backing.</Text>
      </VStack>
      <CheckboxField
        testId="checkbox-field"
        label="Enable sync"
        description="Checkbox row composed from primitives."
        checked={true}
      />
      <VStack testId="radio-group" className="gap-3">
        <RadioField testId="radio-primary" checked={true} label="Primary" description="Default path." />
        <RadioField testId="radio-secondary" checked={false} label="Secondary" description="Fallback path." />
      </VStack>
    </VStack>
  )
}
