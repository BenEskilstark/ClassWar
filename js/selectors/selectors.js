// @flow


// when you want to do A - B, but A must always be >= 0, and you need
// to do something different if B > A, then use this function.
// Returns a {result, deficit, amount} tuple where
// - result is the new value of A after the subtraction, but always >= 0
// - deficit is the leftover value if B > A
// - amount is how much of operandB successfully subtracted
//    (will either equal operandB if deficit = 0 or operandA otherwise,
//    unless a step parameter is provided)
//
// Use the optional step parameter to ensure a minimum leftover
// amount that won't be subtracted if B > A. (ie if A is $27 and
// B is 3 * $10 of items, then step would be 10 and so
// {result: 7, deficit: 3, amount: 20} instead of
// {result: 0, deficit: 3, amount: 27})
const subtractWithDeficit = (operandA, operandB, step) => {
  step = step != null ? step : 1;
  let result = operandA - operandB;
  let amount = operandB;
  let deficit = 0;
  if (result < 0) {
    // for reference, results without step:
    // deficit = -1 * result;
    // amount = operandA;
    // result = 0;

    deficit = -1 * result;
    amount = Math.floor(operandA / step) * step;
    result = operandA % step;
  }
  return {result, deficit, amount};
}



module.exports = {
  subtractWithDeficit,
};
