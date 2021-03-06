import React from 'react'
import { FormattedMessage } from 'react-intl'

import { Button, Link, Icon } from 'blockchain-info-components'
import {
  SettingComponent,
  SettingContainer,
  SettingDescription,
  SettingHeader,
  SettingSummary
} from 'components/Setting'

const TermsOfService = () => {
  return (
    <SettingContainer>
      <SettingSummary>
        <SettingHeader>
          <FormattedMessage
            id='scenes.settings.general.termsofservice.title'
            defaultMessage='Terms of Service'
          />
        </SettingHeader>
        <SettingDescription>
          <FormattedMessage
            id='scenes.settings.general.termsofservice.description'
            defaultMessage='Read our terms and services agreement.'
          />
        </SettingDescription>
      </SettingSummary>
      <SettingComponent>
        <Link href='https://wampum1st.com/terms' target='_blank'>
          <Button nature='empty'>
            <Icon name='open-in-new-tab' size='20px' />
          </Button>
        </Link>
      </SettingComponent>
    </SettingContainer>
  )
}

export default TermsOfService
