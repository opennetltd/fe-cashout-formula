type Tvf = number;
type Setting = {
  ddf: number,
  tvf: Tvf,
}

const findByLower = (settings: Setting[], tvf: Tvf) => {
  if (settings.length === 1) return settings[0];
  const index = settings.findIndex(setting => tvf <= setting.tvf);
  if (index === -1) return settings[settings.length - 1];
  return settings[index > 0 ? index - 1 : 0];
};

const findByUpper = (settings: Setting[], tvf: Tvf) => {
  const setting = settings.find(setting => tvf <= setting.tvf);
  if (!setting) return settings[settings.length - 1];
  return setting;
};

const findByNearest = (settings: Setting[], tvf: Tvf) => {
  if (settings.length === 1) return settings[0];
  for (let i = 0; i < settings.length; i++) {
    const setting = settings[i];
    if (setting.tvf === tvf) return setting;
    if (setting.tvf > tvf) {
      if (i === 0) return setting;
      const upperDiff = setting.tvf - tvf;
      const lowerDiff = tvf - settings[i - 1].tvf;
      return upperDiff <= lowerDiff ? setting : settings[i - 1];
    }
  }
  return settings[settings.length - 1];
};

export default [
  findByNearest,
  findByLower,
  findByUpper,
];
