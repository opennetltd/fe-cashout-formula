import findByMode from './utils/findMyMode';
import { multiply, round } from './utils/math';

type Selection = {
  status: number,
  eventStatus: number,
  currentProbability: number,
  odds: number,
  currentOdds: number,
  originalProbability: number,
  subBetIdIndex: number[],
}

type SubBet = {
  id: string,
  stake: number,
  bonusRatio: string,
}

type CashOutFactorSetting = unknown

type Params = {
  bet: {
    type: number,
    selections: Selection[],
    subBets: SubBet[],
    stake: number,
    originStake: number,
    featureTags: number[],
    isUseGift: boolean,
  };
  apiConfig: {
    isFeatureEnabled: boolean,
    ladderMode: string,
    cashOutFactorSettings: CashOutFactorSetting[],
    isUserCCFCheckPass: boolean,
    oddsTolerance: number,
    minCashOutAmount: number,
    maxCashOutAmount: number,
    zeroMarginCashOutEnabled: boolean,
  }
}

type SubBetMap = {
  [key: string]: { bonusRatio: number, selections: Selection[] },
}

type CalcResponse = {
  isCashAble: boolean,
  coefficient: number,
  maxCashOutAmount: number,
  isSupportPartial: boolean,
  availableStake: number
  execTime: number;
  message?: string;
} | { isCashAble: boolean, isError: boolean, message?: string, execTime: number }

function calcAvailableStake(subBets: SubBet[]) {
  return round(subBets.reduce((prev, subBet) => prev + subBet.stake, 0)) / 10000;
}

function calc({
  bet,
  apiConfig,
}: Params): CalcResponse {
  const execStartTime = new Date().getTime();
  try {
    const {
      subBets, selections, type: betType, featureTags, isUseGift,
    } = bet;

    // flexibet: bet.type = 4
    // one cut: featureTags && featureTags.includes(5)
    if (betType === 4 || (featureTags && featureTags.indexOf(5) > -1) || isUseGift) {
      return {
        isCashAble: false,
        isError: false,
        execTime: new Date().getTime() - execStartTime,
      };
    }
    if (apiConfig.zeroMarginCashOutEnabled) {
      if (
        (bet.stake !== null && bet.originStake !== null && !(bet.stake !== bet.originStake))
      && selections.every(({ status, eventStatus }) => (status === 0 && eventStatus === 0))
      && subBets?.length === 1
      && apiConfig.isUserCCFCheckPass
      ) {
        const [totalOdds, currentTotalOdds] = selections.reduce((prev, curr) => {
          prev[0] *= curr.odds;
          prev[1] *= curr.currentOdds;
          return prev;
        }, [1, 1]);
        const multiplier = ((100 + apiConfig.oddsTolerance) / 100);
        const min = totalOdds / multiplier;
        const max = totalOdds * multiplier;
        if (currentTotalOdds <= max && currentTotalOdds >= min) {
          const availableStake = calcAvailableStake(subBets);
          return {
            isCashAble: availableStake > apiConfig.minCashOutAmount && availableStake < apiConfig.maxCashOutAmount,
            isSupportPartial: true,
            coefficient: 1,
            availableStake,
            maxCashOutAmount: availableStake,
            execTime: new Date().getTime() - execStartTime,
            message: 'zero margin cashout',
          };
        }
      }
    }

    const subBetMap: SubBetMap = subBets.reduce((prev, subBet) => {
      //@ts-ignore
      prev[`${subBet.id}`] = { bonusRatio: +subBet.bonusRatio, selections: [] };
      return prev;
    }, {});

    selections.reduce((_subBetMap, selection) => {
      selection.subBetIdIndex.forEach(index => {
        const subBet = subBets[index];
        _subBetMap[subBet.id].selections.push(selection);
      });
      return _subBetMap;
    }, subBetMap);

    let totalCoefficient = 0;
    let coefficientCount = 0;
    Object.keys(subBetMap).forEach(key => {
      const { bonusRatio, selections: _selections } = subBetMap[key];
      const valueObj = {
        currentProbability: 1,
        originalOdds: 1,
        originalProbability: 1,
      };
      const bonusSelections: Selection[] = [];
      for (let i = 0; i < _selections.length; i++) {
        const selection = _selections[i];
        switch (selection.status) {
          case 0: // running
            if (selection.currentProbability === undefined) throw 'currentProbability unavailable';
            valueObj.currentProbability *= +selection.currentProbability;
            valueObj.originalOdds = multiply(+selection.odds, valueObj.originalOdds);
            valueObj.originalProbability *= +selection.originalProbability;
            bonusSelections.push(selection);
            break;
          case 1: // win
            valueObj.originalOdds = multiply(+selection.odds, valueObj.originalOdds);
            valueObj.originalProbability *= +selection.originalProbability;
            bonusSelections.push(selection);
            break;
          case 2: // lost
            return;
            // 3,4,5,6 do nothing
          default:
            break;
        }
      }

      const tvf = (valueObj.currentProbability / valueObj.originalProbability) * 10000;
      const { ladderMode, cashOutFactorSettings } = apiConfig;
      const setting = findByMode[+ladderMode](cashOutFactorSettings as any, tvf);
      const ddf = setting ? setting.ddf : 0;
      let coefficient = (valueObj.originalOdds * (1 + bonusRatio) * valueObj.currentProbability) / (ddf / 10000);

      const { initialProbability, initialOdds } = bonusSelections.reduce((prev, acc) => {
        prev.initialProbability *= +acc.originalProbability;
        prev.initialOdds = multiply(prev.initialOdds, +acc.odds);
        return prev;
      }, { initialProbability: 1, initialOdds: 1 });

      const trueOdds = 1 / initialProbability;
      const initialEdge = (initialOdds / trueOdds) * (1 + bonusRatio);

      if (initialEdge > 0.985) {
        const coefficientModifier = 0.985 / initialEdge;
        coefficient *= coefficientModifier;
      }
      coefficientCount++;
      totalCoefficient += coefficient;
    });

    const avgCoefficient = round(totalCoefficient / coefficientCount, 8);
    const cashAmount = round(subBets[0].stake / 10000 * totalCoefficient, 2);
    return {
      isCashAble: cashAmount > apiConfig.minCashOutAmount && cashAmount < apiConfig.maxCashOutAmount,
      coefficient: avgCoefficient,
      maxCashOutAmount: cashAmount,
      isSupportPartial: subBets?.length === 1,
      execTime: new Date().getTime() - execStartTime,
      availableStake: calcAvailableStake(subBets),
    };
  } catch (e: unknown) {
    return {
      isCashAble: false,
      isError: true,
      execTime: new Date().getTime() - execStartTime,
      message: (e as Error).toString(),
    };
  }
}

function formula(params: any, useJSON = true): string | {} {
  if (useJSON) return JSON.stringify(calc(JSON.parse(params)));
  return calc(params);
}

export default formula;
