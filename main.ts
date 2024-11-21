import { load } from '@std/dotenv';
import { Transaction, Horizon, Contract, Networks, scValToNative, Address } from '@stellar/stellar-sdk';

const env: Record<string, string> = await load();
const horizon: Horizon.Server = new Horizon.Server(env.HORIZON);
const contract: Contract = new Contract(env.CONTRACT);

console.log('Starting the process, this could take some minutes if your account is pretty active');

let response = await horizon.transactions()
  .forAccount(env.ACCOUNT)
  .order('asc')
  .limit(200)
  .call();

const list: Record<string, string> = {};

while (response.records.length > 0) {
  console.log('...');
  for (const transaction of response.records) {
    const tx: Transaction = new Transaction(transaction.envelope_xdr, Networks.PUBLIC);

    for (const operation of tx.operations) {
      if (operation.type === 'invokeHostFunction') {
        const fnName: string = new TextDecoder().decode(operation.func.value().functionName());
        if (fnName === 'set_record') {
          const contractId: Address = Address.fromScAddress(operation.func.value().contractAddress());
          if (contractId.toString() === contract.toString()) {
            const domain = scValToNative(operation.func.value().args()[0]);
            const tld = scValToNative(operation.func.value().args()[1]);
            const parsedDomain: string = new TextDecoder().decode(domain) + '.' + new TextDecoder().decode(tld);
            list[parsedDomain] = parsedDomain;
          }
        }
      }
    }
  }

  response = await response.next();
}

console.log('Process completed, here are the domains you have registered at some point:');
console.log(Object.values(list));



