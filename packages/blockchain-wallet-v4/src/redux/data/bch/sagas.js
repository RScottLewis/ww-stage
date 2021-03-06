import { call, put, select, take } from 'redux-saga/effects'
import { indexBy, length, map, path, prop } from 'ramda'
import * as A from './actions'
import * as AT from './actionTypes'
import * as S from './selectors'
import * as selectors from '../../selectors'
import {
  convertFromCashAddrIfCashAddr,
  TX_PER_PAGE,
  BCH_FORK_TIME
} from '../../../utils/bch'
import { addFromToAccountNames } from '../../../utils/accounts'
import Remote from '../../../remote'
import * as walletSelectors from '../../wallet/selectors'
import { MISSING_WALLET } from '../utils'
import { HDAccountList } from '../../../types'
import { getAccountsList, getBchTxNotes } from '../../kvStore/bch/selectors'
import { getLockboxBchAccounts } from '../../kvStore/lockbox/selectors'
import * as transactions from '../../../transactions'

const transformTx = transactions.bch.transformTx

export default ({ api }) => {
  const fetchData = function * () {
    try {
      yield put(A.fetchDataLoading())
      const context = yield select(S.getContext)
      const data = yield call(api.fetchBchData, context, { n: 1 })
      const bchData = {
        addresses: indexBy(prop('address'), prop('addresses', data)),
        info: path(['wallet'], data),
        latest_block: path(['info', 'latest_block'], data)
      }
      yield put(A.fetchDataSuccess(bchData))
    } catch (e) {
      yield put(A.fetchDataFailure(e.message))
    }
  }

  const fetchFee = function * () {
    try {
      yield put(A.fetchFeeLoading())
      const data = yield call(api.getBchFee)
      yield put(A.fetchFeeSuccess(data))
    } catch (e) {
      yield put(A.fetchFeeFailure(e.message))
    }
  }

  const fetchRates = function * () {
    try {
      yield put(A.fetchRatesLoading())
      const data = yield call(api.getBchTicker)
      yield put(A.fetchRatesSuccess(data))
    } catch (e) {
      yield put(A.fetchRatesFailure(e.message))
    }
  }

  const watchTransactions = function * () {
    while (true) {
      const action = yield take(AT.FETCH_BCH_TRANSACTIONS)
      yield call(fetchTransactions, action)
    }
  }

  const fetchTransactions = function * ({ type, payload }) {
    const { address, reset } = payload
    try {
      const pages = yield select(S.getTransactions)
      const offset = reset ? 0 : length(pages) * TX_PER_PAGE
      const transactionsAtBound = yield select(S.getTransactionsAtBound)
      if (transactionsAtBound && !reset) return
      yield put(A.fetchTransactionsLoading(reset))
      const walletContext = yield select(S.getWalletContext)
      const context = yield select(S.getContext)
      const convertedAddress = convertFromCashAddrIfCashAddr(address)
      const data = yield call(api.fetchBchData, context, {
        n: TX_PER_PAGE,
        onlyShow: convertedAddress || walletContext.join('|'),
        offset
      })
      const filteredTxs = data.txs.filter(tx => tx.time > BCH_FORK_TIME)
      const atBounds = length(filteredTxs) < TX_PER_PAGE
      yield put(A.transactionsAtBound(atBounds))
      const page = yield call(__processTxs, filteredTxs)
      yield put(A.fetchTransactionsSuccess(page, reset))
    } catch (e) {
      yield put(A.fetchTransactionsFailure(e.message))
    }
  }

  const __processTxs = function * (txs) {
    // Page == Remote ([Tx])
    // Remote(wallet)
    const wallet = yield select(walletSelectors.getWallet)
    const walletR = Remote.of(wallet)
    const accountList = (yield select(getAccountsList)).getOrElse([])
    const txNotes = (yield select(getBchTxNotes)).getOrElse({})
    const lockboxAccountList = (yield select(getLockboxBchAccounts))
      .map(HDAccountList.fromJS)
      .getOrElse([])

    // transformTx :: wallet -> Tx
    // ProcessPage :: wallet -> [Tx] -> [Tx]
    const ProcessTxs = (wallet, lockboxAccountList, txList, txNotes) =>
      map(
        transformTx.bind(
          undefined,
          wallet.getOrFail(MISSING_WALLET),
          lockboxAccountList,
          txNotes
        ),
        txList
      )
    // ProcessRemotePage :: Page -> Page
    const processedTxs = ProcessTxs(walletR, lockboxAccountList, txs, txNotes)
    return addFromToAccountNames(wallet, accountList, processedTxs)
  }

  const fetchTransactionHistory = function * ({ payload }) {
    const { address, start, end } = payload
    try {
      yield put(A.fetchTransactionHistoryLoading())
      const currency = yield select(selectors.settings.getCurrency)
      if (address) {
        const convertedAddress = convertFromCashAddrIfCashAddr(address)
        const data = yield call(
          api.getTransactionHistory,
          'BCH',
          convertedAddress,
          currency.getOrElse('USD'),
          start,
          end
        )
        yield put(A.fetchTransactionHistorySuccess(data))
      } else {
        const context = yield select(S.getContext)
        const active = context.join('|')
        const data = yield call(
          api.getTransactionHistory,
          'BCH',
          active,
          currency.getOrElse('USD'),
          start,
          end
        )
        yield put(A.fetchTransactionHistorySuccess(data))
      }
    } catch (e) {
      yield put(A.fetchTransactionHistoryFailure(e.message))
    }
  }

  return {
    fetchData,
    fetchFee,
    fetchRates,
    fetchTransactionHistory,
    fetchTransactions,
    watchTransactions,
    __processTxs
  }
}
