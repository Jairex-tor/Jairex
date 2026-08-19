function getTip(savingsData) {
  const { currentAmount, targetAmount, timesPerWeek, amountPerDeposit, transactions } = savingsData;
  const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const weeklyContribution = timesPerWeek * amountPerDeposit;
  const remaining = targetAmount - currentAmount;
  const weeksLeft = weeklyContribution > 0 ? Math.ceil(remaining / weeklyContribution) : Infinity;

  if (progress >= 100) {
    return {
      type: 'celebration',
      message: 'You did it! Your goal is complete! Time to celebrate together!',
      icon: 'trophy'
    };
  }

  if (progress >= 75) {
    return {
      type: 'motivation',
      message: `Amazing progress! You're ${Math.round(progress)}% there. Just ${weeksLeft} week${weeksLeft !== 1 ? 's' : ''} to go!`,
      icon: 'diamond'
    };
  }

  if (progress >= 50) {
    return {
      type: 'motivation',
      message: `Halfway there! ${Math.round(progress)}% complete. Keep mining those savings!`,
      icon: 'iron'
    };
  }

  if (progress >= 25) {
    return {
      type: 'tip',
      message: `Solid start at ${Math.round(progress)}%! Try adding an extra deposit this week to reach your goal faster.`,
      icon: 'gold'
    };
  }

  if (transactions && transactions.length === 0) {
    return {
      type: 'tip',
      message: 'Every great adventure starts with a single block. Make your first deposit to begin!',
      icon: 'crafting_table'
    };
  }

  if (weeklyContribution > 0 && weeksLeft > 52) {
    return {
      type: 'suggestion',
      message: `At your current pace, this will take over a year. Consider increasing your deposit amount or frequency to finish sooner!`,
      icon: 'redstone'
    };
  }

  if (timesPerWeek < 3) {
    return {
      type: 'suggestion',
      message: `Depositing ${timesPerWeek} time${timesPerWeek !== 1 ? 's' : ''} per week is great. Even one extra deposit per week could save you ${Math.ceil(remaining / (amountPerDeposit * 2)) - weeksLeft} week${weeksLeft !== 1 ? 's' : ''}!`,
      icon: 'ender_pearl'
    };
  }

  return {
    type: 'motivation',
    message: `You're building something beautiful together. ${Math.round(progress)}% down, ${weeksLeft} week${weeksLeft !== 1 ? 's' : ''} to go. Keep it up!`,
    icon: 'emerald'
  };
}

module.exports = { getTip };
