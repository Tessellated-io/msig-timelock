import smartpy as sp

class Contract(sp.Contract):
  def __init__(self):
    self.init(nonce = 0, operator_public_keys = sp.list([sp.key('edpkv3w95AcgCWQeoYm5szaEqXX71JkZ261s4wjH1NYRtibX879rDv'), sp.key('edpkvHmY5Hnqp4ffrSHUjnBNUHmFXCfh4qQDs2mtH2XZBb6N9BA95R'), sp.key('edpkuhrfeWnjBZ5pHiNQVgVYDahHs6JWrvpCMueTeJSFS3A7227Krt'), sp.key('edpkvQr18UYqhZ4EvbJwUufF8o54EK7RiumFHbymoxJRYtXHAXf7h2'), sp.key('edpku1EFLTjrKTzZXVDpw6CuJJDbZAXRdiF53B314cikwPN2ukUDA2')]), signers_threshold = 3, timelock = {}, timelock_seconds = 1)

  @sp.entry_point
  def addExecutionRequest(self, params):
    sp.set_type(params, sp.TPair(sp.TMap(sp.TKeyHash, sp.TSignature), sp.TPair(sp.TChainId, sp.TPair(sp.TNat, sp.TLambda(sp.TUnit, sp.TList(sp.TOperation))))))
    match_pair_89_fst, match_pair_89_snd = sp.match_tuple(params, names = [ "match_pair_89_fst", "match_pair_89_snd" ])
    match_pair_92_fst, match_pair_92_snd = sp.match_tuple(match_pair_89_snd, names = [ "match_pair_92_fst", "match_pair_92_snd" ])
    match_pair_93_fst, match_pair_93_snd = sp.match_tuple(match_pair_92_snd, names = [ "match_pair_93_fst", "match_pair_93_snd" ])
    sp.verify(sp.pack(sp.set_type_expr(match_pair_92_fst, sp.TChainId)) == sp.pack(sp.set_type_expr(sp.chain_id, sp.TChainId)), message = 'BAD_CHAIN_ID')
    sp.verify(match_pair_93_fst == (self.data.nonce + 1), message = 'BAD_NONCE')
    valid_signatures_counter = sp.local("valid_signatures_counter", 0)
    sp.for operator_public_key in self.data.operator_public_keys:
      sp.if match_pair_89_fst.contains(sp.hash_key(operator_public_key)):
        sp.verify(sp.check_signature(operator_public_key, match_pair_89_fst[sp.hash_key(operator_public_key)], sp.pack(match_pair_89_snd)), message = 'BAD_SIGNATURE')
        valid_signatures_counter.value += 1
    sp.verify(valid_signatures_counter.value >= self.data.signers_threshold, message = 'TOO_FEW_SIGS')
    self.data.nonce += 1
    self.data.timelock[self.data.nonce] = (sp.now, match_pair_93_snd)

  @sp.entry_point
  def execute(self, params):
    match_pair_126_fst, match_pair_126_snd = sp.match_tuple(self.data.timelock[params], names = [ "match_pair_126_fst", "match_pair_126_snd" ])
    sp.verify(sp.add_seconds(match_pair_126_fst, sp.to_int(self.data.timelock_seconds)) < sp.now, message = 'TOO_EARLY')
    del self.data.timelock[params]
    sp.set_type(match_pair_126_snd(sp.unit), sp.TList(sp.TOperation))
    sp.for op in match_pair_126_snd(sp.unit):
      sp.operations().push(op)