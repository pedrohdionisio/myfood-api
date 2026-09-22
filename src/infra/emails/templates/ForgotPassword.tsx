import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text
} from '@react-email/components'
import { TailwindConfig } from '../components/TailwindConfig.js'

export interface IForgotPasswordProps {
  code: string
}

export default function ForgotPassword({ code }: IForgotPasswordProps) {
  return (
    <TailwindConfig>
      <Html lang="pt-BR">
        <Head />
        <Preview>Seu código de recuperação do MyFood</Preview>

        <Body className="bg-myfood-surface font-sans py-10">
          <Container className="bg-white rounded-[8px] max-w-[480px] px-10 py-10">
            <Heading as="h1" className="text-myfood-red text-2xl font-bold m-0">
              MyFood
            </Heading>

            <Heading as="h2" className="text-myfood-ink text-xl font-semibold mt-6 mb-2">
              Recupere a sua conta
            </Heading>

            <Text className="text-myfood-muted text-base leading-6 mt-0">
              Use o código abaixo para cadastrar uma nova senha:
            </Text>

            <Section className="text-center my-8">
              <span className="inline-block bg-myfood-surface text-myfood-ink rounded-[8px] px-8 py-4 text-3xl font-bold tracking-[12px]">
                {code}
              </span>
            </Section>

            <Text className="text-myfood-muted text-sm leading-5">
              O código vale por 1 hora. Se você não pediu uma nova senha, ignore este e-mail: sua
              conta continua segura.
            </Text>

            <Hr className="border-myfood-surface my-6" />

            <Text className="text-myfood-muted text-xs m-0">
              MyFood — este é um e-mail automático, não responda.
            </Text>
          </Container>
        </Body>
      </Html>
    </TailwindConfig>
  )
}

ForgotPassword.PreviewProps = {
  code: '123456'
} satisfies IForgotPasswordProps
