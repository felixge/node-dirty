test:
	@find test/simple/test-*.js | xargs -n 1 -t node

benchmark:
	@find benchmark/benchmark-*.js | xargs -n 1 -t node

.PHONY: test benchmark