import { Remote } from 'blockchain-wallet-v4/src'
import { getData as getDataBtcBch } from 'components/Form/SelectBoxBtcAddresses/selectors'
import { selectors } from 'data'

export const getData = (state, ownProps) => {
  switch (ownProps.coin) {
    case 'ETH':
      return {
        data: Remote.of({
          legacyEthAddr: selectors.core.kvStore.eth
            .getLegacyAccountAddress(state)
            .getOrElse(null)
        })
      }
  }
}
