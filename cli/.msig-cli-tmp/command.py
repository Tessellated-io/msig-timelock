
import smartpy as sp

def command(self):
  transfer_operation = sp.transfer_operation(
    undefined,
    sp.mutez(0), 
    sp.contract(None, sp.address("undefined")
  ).open_some())
  
  operation_list = [ transfer_operation ]
  
  sp.result(operation_list)
