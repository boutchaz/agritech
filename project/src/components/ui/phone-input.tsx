import * as React from 'react'
import * as RPNInput from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import { ChevronsUpDown, Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

import 'react-phone-number-input/style.css'

const PhoneInputInvalidContext = React.createContext(false)

type PhoneInputProps = Omit<
  React.ComponentProps<'input'>,
  'onChange' | 'value' | 'ref'
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, 'onChange'> & {
    onChange?: (value: RPNInput.Value) => void
    invalid?: boolean
  }

/** Stable `inputComponent` ref so RPNInput does not remount the field on every parent render (fixes focus loss per keystroke). */
const RPNBoundInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  (inputProps, ref) => {
    const invalid = React.useContext(PhoneInputInvalidContext)
    return (
      <Input
        {...inputProps}
        ref={ref}
        invalid={invalid}
        className={cn('rounded-s-none rounded-e-lg', inputProps.className)}
      />
    )
  },
)
RPNBoundInput.displayName = 'PhoneInputBoundInput'

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> =
  React.forwardRef<React.ComponentRef<typeof RPNInput.default>, PhoneInputProps>(
    ({ className, onChange, invalid, ...props }, ref) => (
      <PhoneInputInvalidContext.Provider value={!!invalid}>
        <RPNInput.default
          ref={ref}
          className={cn('flex', className)}
          flagComponent={FlagComponent}
          countrySelectComponent={CountrySelect}
          inputComponent={RPNBoundInput}
          smartCaret={false}
          onChange={(value) => onChange?.(value || ('' as RPNInput.Value))}
          {...props}
        />
      </PhoneInputInvalidContext.Provider>
    ),
  )
PhoneInput.displayName = 'PhoneInput'

type CountrySelectOption = { label: string; value: RPNInput.Country }

type CountrySelectProps = {
  disabled?: boolean
  value: RPNInput.Country
  onChange: (value: RPNInput.Country) => void
  options: CountrySelectOption[]
}

const CountrySelect = ({
  disabled,
  value,
  onChange,
  options,
}: CountrySelectProps) => {
  const handleSelect = React.useCallback(
    (country: RPNInput.Country) => onChange(country),
    [onChange],
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'flex h-10 gap-1 rounded-e-none rounded-s-lg border-r-0 px-3',
          )}
          disabled={disabled}
        >
          <FlagComponent country={value} countryName={value} />
          <ChevronsUpDown
            className={cn(
              '-mr-2 h-4 w-4 opacity-50',
              disabled ? 'hidden' : 'opacity-100',
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandList>
            <ScrollArea className="h-72">
              <CommandInput placeholder="Search country..." />
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {options
                  .filter((o) => o.value)
                  .map((option) => (
                    <CommandItem
                      className="gap-2"
                      key={option.value}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <FlagComponent
                        country={option.value}
                        countryName={option.label}
                      />
                      <span className="flex-1 text-sm">{option.label}</span>
                      {option.value && (
                        <span className="text-sm text-foreground/50">
                          {`+${RPNInput.getCountryCallingCode(option.value)}`}
                        </span>
                      )}
                      <Check
                        className={cn(
                          'ml-auto h-4 w-4',
                          option.value === value ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country]
  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20">
      {Flag && <Flag title={countryName} />}
    </span>
  )
}
FlagComponent.displayName = 'FlagComponent'

export { PhoneInput }
