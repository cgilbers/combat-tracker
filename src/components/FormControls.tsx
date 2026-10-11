import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement>

export function FieldLabel({ className = '', ...props }: FieldLabelProps) {
  return (
    <label
      className={`flex flex-col gap-2 font-mono text-[11px] tracking-[.3px] text-muted uppercase ${className}`}
      {...props}
    />
  )
}

const controlClasses =
  'box-border w-full border border-line bg-[#161a18] px-3 py-2.5 font-sans text-sm text-ink normal-case tracking-normal outline-none placeholder:text-dim focus:border-lime'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function TextInput({ className = '', ...props }: InputProps) {
  return <input className={`${controlClasses} ${className}`} {...props} />
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function SelectInput({ className = '', ...props }: SelectProps) {
  return <select className={`${controlClasses} ${className}`} {...props} />
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function TextArea({ className = '', ...props }: TextAreaProps) {
  return (
    <textarea
      className={`${controlClasses} min-h-[78px] resize-y ${className}`}
      {...props}
    />
  )
}
